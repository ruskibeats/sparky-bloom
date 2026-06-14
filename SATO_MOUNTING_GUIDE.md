# Sato Routes Mounting Guide

## Integration Steps

### Step 1: Add Imports to SparkyFitnessServer.ts

```typescript
// sparky-bloom/server/SparkyFitnessServer.ts

import t1dCompanionRoutes from './routes/t1dCompanionRoutes';
import t1dSatoRoutes from './routes/t1dSatoRoutes';
import t1dNerdStatsRoutes from './routes/t1dNerdStatsRoutes';

// Other existing imports...
```

### Step 2: Add Route Mounting

```typescript
// sparky-bloom/server/SparkyFitnessServer.ts

// EXISTING: Original companion endpoints (unchanged)
server.use('/api/t1d/companion', t1dCompanionRoutes);

// NEW: Sato-aware endpoints (parallel deployment)
server.use('/api/t1d/sato', t1dSatoRoutes);

// NEW: Nerd Stats endpoints (parallel deployment)
server.use('/api/t1d/nerd-stats', t1dNerdStatsRoutes);

// EXISTING: Other routes...
server.use('/api/t1d/fitbit', fitbitRoutes);
// etc.
```

### Step 3: Verify Mounting

After mounting, verify routes are accessible:

```bash
# Check Sato greeting endpoint
curl -X GET http://localhost:3000/api/t1d/sato/greeting \
  -H "Cookie: sparky_active_user_id=your_user_id"

# Check Sato cards endpoint
curl -X POST http://localhost:3000/api/t1d/sato/cards \
  -H "Cookie: sparky_active_user_id=your_user_id" \
  -H "Content-Type: application/json" \
  -d '{"action": "meal", "text": "I had pizza and salad"}'

# Check Nerd Stats endpoint
curl -X POST http://localhost:3000/api/t1d/nerd-stats/cards \
  -H "Cookie: sparky_active_user_id=your_user_id" \
  -H "Content-Type: application/json" \
  -d '{"action": "meal", "text": "I had pizza and salad"}'
```

## Route Priority

The route mounting order matters. Make sure Sato routes are mounted:

1. **After `/api/t1d/companion`**
2. **Before other routes**

This ensures proper routing and prevents conflicts.

## Authentication

All Sato endpoints use the same authentication middleware as existing T1D endpoints:

```typescript
// Auth middleware is applied to /api/t1d/* routes
// Already in place in SparkyFitnessServer.ts
server.use('/api/t1d/*', authMiddleware);
```

## Security

Sato endpoints inherit all existing security measures:

- JWT authentication
- User context from `sparky_active_user_id` cookie
- Same rate limiting
- Same authorization policies

## Performance Considerations

### Template Rendering
- **Fast:** <50ms per request (no LLM calls)
- **Deterministic:** No network latency
- **Scalable:** Can handle thousands of requests per second

### LLM Fallback
- **Slow:** ~1-2s per request (network latency)
- **Complex:** Only for complex cases (complexityScore >= 0.7)
- **Cached:** Responses cached for 15 minutes

### Database Queries
- **Shared:** No new database queries
- **Existing:** Reuses `getCompanionDataContext()`
- **Optimized:** Same queries as existing layer

## Error Handling

All endpoints include proper error handling:

```typescript
try {
  const greeting = await getSatoGreeting(userId, text);
  res.json(greeting);
} catch (error: any) {
  res.status(500).json({
    error: 'Failed to generate Sato greeting',
    message: error.message
  });
}
```

## Logging

Add logging for debugging:

```typescript
console.log(`[Sato] Greeting requested for user: ${userId}`);
const greeting = await getSatoGreeting(userId, text);
console.log(`[Sato] Greeting generated: mood=${greeting.emotion}`);
```

## Monitoring

Track these metrics:

- **Sato greeting requests:** `/api/t1d/sato/greeting` calls
- **Sato cards requests:** `/api/t1d/sato/cards` calls
- **Nerd Stats requests:** `/api/t1d/nerd-stats` calls
- **Average response time:** Template vs LLM fallback
- **Complexity score distribution:** LLM fallback frequency

## Rollback Plan

If issues arise with Sato endpoints:

1. **Remove route mounting:**
```typescript
// Comment out Sato routes
// server.use('/api/t1d/sato', t1dSatoRoutes);
// server.use('/api/t1d/nerd-stats', t1dNerdStatsRoutes);
```

2. **Existing endpoints remain functional** — no breaking changes

3. **Deploy rollback** without restarting server if routes are dynamic

## Testing Checklist

- [ ] Sato greeting endpoint returns 200 OK
- [ ] Sato cards endpoint returns 200 OK
- [ ] Nerd Stats endpoint returns 200 OK
- [ ] All endpoints require authentication
- [ ] Error handling works for missing data
- [ ] Response times are acceptable (<1s for templates)
- [ ] Server health endpoint still returns 200
- [ ] Existing companion endpoints still work
- [ ] No route conflicts with existing endpoints
- [ ] Authentication cookie is passed correctly
- [ ] CORS is configured correctly
- [ ] Rate limiting is working

## Support

If mounting fails:

1. Check that route imports are correct
2. Verify mount order (Sato routes after companion routes)
3. Check for syntax errors in route files
4. Review server logs for errors
5. Verify database connectivity
6. Check that port 3000 is available

## Additional Resources

- See `SATO_IMPLEMENTATION.md` for complete architecture
- See `t1dCompanionService.ts` for existing companion layer
- See `t1dSatoRoutes.ts` for endpoint definitions
- See `SparkyFitnessServer.ts` for server configuration