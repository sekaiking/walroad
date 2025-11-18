# Walroad - TODO List

> Comprehensive AI codebase review findings - 82 issues identified

## NOT TODAY

- [ ] **Broken API endpoint** - `app/api/v1/blobs/route.ts:23` - null keypair, endpoint non-functional
- [ ] **Missing MAINNET Seal key servers** - `src/lib/sealService.ts:17-19` - placeholder IDs need real values

## 🔴 Critical Issues (4)

- [x] **Missing env variable in .env.example** - Add `NEXT_PUBLIC_COLLECTION_PACKAGE_ID`
- [ ] **useEffect missing dependency** - `src/ui/CollectionView.tsx:309` - `checkAndLoadCache` not in deps array

## 🧹 Cleanup Needed (7)

- [x] **Delete backup files** - Remove `CreateCollection_old.tsx` and `CreateCollection_backup.tsx`
- [x] **Move documentation files** - Relocate 10 .md files from root to `docs/` folder
- [x] **Remove unused imports** - Clean up `CreateCollection.tsx` and `CollectionView.tsx`
- [x] **Delete unused encryption.ts** - File appears unused (Seal is used instead)

## 📝 Code Quality (23)

### TypeScript Issues

- [x] **Replace any types in suiContract.ts** - Lines 188, 221, 293, 314, 325, 332, 402
- [x] **Replace any in walrus.ts:43** - Define proper walrus options type
- [x] **Fix any cast in CreateCollection.tsx:173** - Type encryptedBlob properly
- [x] **Use unknown in catch blocks** - Replace `catch (err: any)` with `unknown`

### Console.log Removal (40+ instances)

- [x] **Create logger utility** - `src/lib/logger.ts`
- [x] **Replace console.logs in CollectionList.tsx**
- [x] **Replace console.logs in CollectionView.tsx** - 15 instances
- [x] **Replace console.logs in CreateCollection.tsx** - 7 instances
- [x] **Replace console.logs in layout.tsx**
- [x] **Replace console.logs in fileCache.ts** - 7 instances
- [x] **Replace console.logs in suiContract.ts** - 3 instances
- [x] **Replace console.logs in walrusService.ts** - 2 instances
- [x] **Replace console.logs in sealService.ts**

### Alert Replacement

- [x] **Install/create toast system** - Replace alert() with proper notifications
- [x] **Replace alerts in CollectionView.tsx** - 3 instances (lines 56, 61, 72)
- [x] **Replace alerts in CreateCollection.tsx** - 3 instances (lines 85, 90, 95)

### Other Quality Issues

- [x] **Fix "Unlisted" label** - `CollectionView.tsx:376` shows "Private" instead
- [x] **Extract encodeMetadataForMove()** - Duplicated in suiContract.ts lines 42-49 & 99-106
- [x] **Extract getFileContentType()** - Duplicated file type detection logic
- [x] **Remove commented code** - `CreateCollection.tsx` lines 167-193, 204-230, 541-560

## ⚡ Performance Issues (8)

- [ ] **Parallel file uploads** - `walrusService.ts:158-180` - Upload files concurrently
- [ ] **Add pagination** - `suiContract.ts:180` - Support cursor-based pagination
- [ ] **Memoize getFileUrl/getFileName** - `CollectionView.tsx:323,331` - Prevent recreating functions
- [ ] **Optimize queryUserCollections** - `suiContract.ts:217` - Server-side filtering
- [ ] **Add lazy loading for images** - Use Next.js Image or loading="lazy"
- [ ] **Proactive cache checking** - Check cache status earlier
- [ ] **Request deduplication** - Use React Query or implement cache
- [ ] **Web Workers for large files** - Offload IndexedDB operations

## 🔒 Security Concerns (5)

- [ ] **Remove .env.local from git** - Should not be committed
- [ ] **Add file upload validation** - Validate file types and sizes server-side
- [ ] **Add API rate limiting** - `app/api/v1/blobs/route.ts`
- [ ] **Sanitize user input** - XSS risk in collection name/description
- [ ] **Add CORS configuration** - Missing in API route

## 🎨 UI/UX Issues (12)

- [x] **Add skeleton loader component** - Skeleton loaders for explore and my-collections pages
- [x] **Improve empty state** - My-collections needs "Create First Collection" CTA
- [x] **Standardize error messages** - Consistent error handling UI
- [x] **Add aria-labels** - Visibility buttons and file upload dropzone
- [x] **Add keyboard navigation** - File grid should be keyboard accessible
- [x] **Improve image alt text** - More descriptive alt attributes
- [x] **Better copy feedback** - Toast for "Copied!" message
- [ ] **Extract hardcoded strings** - First step toward i18n
- [x] **Close mobile menu on navigation** - Menu stays open after clicking link
- [x] **Validate price input** - Prevent negative numbers and limit decimals
- [x] **Show encrypted file placeholder** - Lock icon or placeholder before decryption
- [ ] **Clarify Private vs Unlisted** - Better UI explanation

## ⚛️ React Best Practices (11)

- [ ] **Add AbortController** - `FilePreviewModal.tsx:23` - Cancel fetch on unmount
- [ ] **Prevent state updates after unmount** - `CollectionView.tsx:autoDecryptFiles`
- [ ] **Consider Context for collection data** - Reduce prop drilling
- [ ] **Wrap in form element** - `CreateCollection.tsx` should use proper form
- [ ] **Add error boundaries** - App-wide error boundary component
- [ ] **Extract inline handlers** - Large forms should extract onChange handlers
- [ ] **Add transaction loading state** - "Tip Creator" needs visual feedback
- [ ] **Use createPortal for modals** - `PaymentModal.tsx`
- [ ] **Fix URL revocation timing** - `CollectionView.tsx:316` - Only revoke on unmount
- [ ] **Split large components** - `CreateCollection.tsx` → ConfigForm, FileUploader, ProgressView
- [ ] **Add proper form validation** - Inline validation instead of alerts

## 🔌 Integration Issues (6)

- [ ] **Move Seal key servers to env** - `sealService.ts:10-19` - Use environment variables
- [ ] **Better Seal error handling** - `CollectionView.tsx:279` - Stop on failure or retry
- [ ] **Fix Walrus client initialization** - `walrus.ts:58` - Lazy initialization
- [ ] **Better transaction error messages** - Parse and display blockchain errors
- [ ] **Add retry logic for uploads** - `walrusService.ts:63` - Exponential backoff
- [ ] **Create singleton SuiClient** - Used in 3 files, should be shared

## 📚 Documentation Issues (6)

- [ ] **Add JSDoc** - `suiContract.ts:parseCollectionData` needs documentation
- [ ] **Resolve TODOs** - 2 TODO comments need addressing
- [ ] **Fix comment style** - `sealService.ts:16` - Use TODO/FIXME not FIX
- [ ] **Update README.md** - Reflect current architecture
- [ ] **Add API documentation** - OpenAPI/Swagger for API routes
- [ ] **Move commented code** - To documentation or separate example file

## Progress

- **Total Issues:** 82
- **Completed:** 0
- **In Progress:** 0
- **Remaining:** 82

---

*Generated: 2025-11-17*
*Last Updated: 2025-11-21*
