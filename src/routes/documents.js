const express = require('express');
const router = express.Router();
const multer = require('multer');
const prisma = require('../lib/prisma');
const { uploadFile, getSignedUrl, deleteFile } = require('../lib/storage');
const { authenticateToken } = require('../middleware/auth');

// In-memory Multer storage for buffer processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

/**
 * POST /api/documents/upload
 * Upload document to Supabase Object Storage & record in PostgreSQL
 */
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { dealId, documentType, title } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    if (!dealId) {
      return res.status(400).json({ error: 'Deal ID is required.' });
    }

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found.' });
    }

    // Determine subfolder based on documentType
    let subfolder = 'kyc';
    if (documentType === 'PAYMENT_PROOF') subfolder = 'payments';
    if (documentType === 'FINAL_DELIVERABLE_CERTIFICATE') subfolder = 'deliverables';
    if (documentType === 'LEGAL_AGREEMENT') subfolder = 'agreements';

    // 1. Upload to Supabase Storage
    const uploadResult = await uploadFile({
      dealCode: deal.dealCode,
      fileBuffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      subfolder,
    });

    // 2. Save document record in PostgreSQL
    const docRecord = await prisma.document.create({
      data: {
        dealId: deal.id,
        title: title || file.originalname,
        documentType: documentType || 'OTHER',
        fileUrl: uploadResult.path,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedByUserId: req.user.id,
        isVerified: ['LEGAL', 'ADMIN'].includes(req.user.role) && documentType === 'LEGAL_AGREEMENT',
        verifiedByRole: ['LEGAL', 'ADMIN'].includes(req.user.role) && documentType === 'LEGAL_AGREEMENT' ? 'LEGAL' : null,
      },
    });

    // If this is payment proof, link it to the corresponding payment and verify if payment is verified
    if (documentType === 'PAYMENT_PROOF') {
      const targetPayment = await prisma.payment.findFirst({
        where: {
          dealId: deal.id,
          OR: [{ paymentProofUrl: '' }, { paymentProofUrl: null }],
        },
        orderBy: { trancheNumber: 'asc' },
      });
      if (targetPayment) {
        await prisma.payment.update({
          where: { id: targetPayment.id },
          data: { paymentProofUrl: uploadResult.path },
        });
        if (targetPayment.status === 'VERIFIED') {
          await prisma.document.update({
            where: { id: docRecord.id },
            data: { isVerified: true, verifiedByRole: 'ACCOUNTS' },
          });
          docRecord.isVerified = true;
          docRecord.verifiedByRole = 'ACCOUNTS';
        }
      } else {
        // If all payments on the deal are verified, auto-verify this proof
        const allPayments = await prisma.payment.findMany({ where: { dealId: deal.id } });
        if (allPayments.length > 0 && allPayments.every((p) => p.status === 'VERIFIED')) {
          await prisma.document.update({
            where: { id: docRecord.id },
            data: { isVerified: true, verifiedByRole: 'ACCOUNTS' },
          });
          docRecord.isVerified = true;
          docRecord.verifiedByRole = 'ACCOUNTS';
        }
      }
    }

    // If this is Company PAN document, link to client record
    if (documentType === 'COMPANY_PAN' || (documentType === 'KYC_PAN' && title?.toLowerCase().includes('company pan'))) {
      await prisma.client.update({
        where: { id: deal.clientId },
        data: { companyPanUrl: uploadResult.path },
      });
    }

    // If this is Legal Agreement document, link to deal record
    if (documentType === 'LEGAL_AGREEMENT' || title?.toLowerCase().includes('legal agreement') || title?.toLowerCase().includes('service agreement')) {
      await prisma.deal.update({
        where: { id: deal.id },
        data: { legalAgreementUrl: uploadResult.path },
      });
    }

    return res.status(201).json({
      message: 'Document uploaded successfully.',
      document: docRecord,
    });
  } catch (error) {
    console.error('Document upload error:', error);
    return res.status(500).json({ error: `Failed to upload document: ${error.message}` });
  }
});

/**
 * GET /api/documents/:id/signed-url
 * Generate a secure 1-hour signed preview URL for in-app viewing
 */
router.get('/:id/signed-url', authenticateToken, async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const signedUrl = await getSignedUrl(document.fileUrl, 3600); // 1 hour

    return res.json({
      signedUrl,
      fileName: document.fileName,
      mimeType: document.mimeType,
      title: document.title,
    });
  } catch (error) {
    console.error('Signed URL generation error:', error);
    return res.status(500).json({ error: 'Failed to generate document preview link.' });
  }
});

/**
 * PATCH /api/documents/:id/verify
 * Legal or Accounts marks document verified or deficient
 */
router.patch('/:id/verify', authenticateToken, async (req, res) => {
  try {
    const { isVerified, deficiencyNotes } = req.body;

    const updated = await prisma.document.update({
      where: { id: req.params.id },
      data: {
        isVerified: Boolean(isVerified),
        verifiedByRole: req.user.role,
        deficiencyNotes: deficiencyNotes || null,
      },
    });

    return res.json({ message: 'Document verification status updated.', document: updated });
  } catch (error) {
    console.error('Document status error:', error);
    return res.status(500).json({ error: 'Failed to update document status.' });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete document
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    await deleteFile(document.fileUrl);
    await prisma.document.delete({ where: { id: document.id } });

    return res.json({ message: 'Document deleted successfully.' });
  } catch (error) {
    console.error('Delete document error:', error);
    return res.status(500).json({ error: 'Failed to delete document.' });
  }
});

module.exports = router;
