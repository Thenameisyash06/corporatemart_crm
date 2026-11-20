const { PrismaClient } = require('@prisma/client');

// Global singleton to reuse connection pools across warm serverless invocations on Vercel
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (!globalForPrisma.__prisma) {
  globalForPrisma.__prisma = prisma;
}

// Fields to preserve original case (IDs, passwords, URLs, storage paths, mime types, UUIDs)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function shouldPreserveCase(key, value) {
  if (typeof value !== 'string') return true;
  // Never alter UUIDs
  if (UUID_REGEX.test(value)) return true;
  const lowerKey = key.toLowerCase();
  // Never alter any ID (id, bdmId, clientId, etc.), URLs, paths, passwords, hashes, dealCode
  if (
    lowerKey === 'id' ||
    lowerKey.endsWith('id') ||
    lowerKey.endsWith('ids') ||
    lowerKey.endsWith('url') ||
    lowerKey.endsWith('path') ||
    lowerKey.includes('password') ||
    lowerKey.includes('hash') ||
    lowerKey === 'mimetype' ||
    lowerKey === 'dealcode'
  ) {
    return true;
  }
  return false;
}

function uppercaseDataStrings(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map((item) => uppercaseDataStrings(item));
  }
  const result = { ...data };
  for (const [key, value] of Object.entries(result)) {
    if (shouldPreserveCase(key, value)) {
      continue;
    }
    if (typeof value === 'string') {
      result[key] = value.toUpperCase();
    } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      result[key] = uppercaseDataStrings(value);
    }
  }
  return result;
}

// Automatically convert all stored text data to CAPSLOCK (excluding User passwords/hashes/IDs/URLs)
prisma.$use(async (params, next) => {
  if (params.model !== 'User') {
    if (['create', 'update', 'upsert'].includes(params.action) && params.args?.data) {
      params.args.data = uppercaseDataStrings(params.args.data);
    } else if (['createMany', 'updateMany'].includes(params.action)) {
      if (Array.isArray(params.args?.data)) {
        params.args.data = params.args.data.map(uppercaseDataStrings);
      } else if (params.args?.data) {
        params.args.data = uppercaseDataStrings(params.args.data);
      }
    }
  }
  return next(params);
});

module.exports = prisma;
