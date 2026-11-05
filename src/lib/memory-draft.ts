/** sessionStorage key for text waiting in the Save-a-memory form. Finance details never go in a URL. */
export const MEMORY_DRAFT_KEY = 'memeora.memoryDraft';
/** Asks the Memory page to open its form. */
export const MEMORY_OPEN_KEY = 'memeora.memoryOpen';
export const MEMORY_OPEN_EVENT = 'memeora:open-memory-form';

/** Opens the Save-a-memory form, from any page. */
export function requestNewMemory(router: { push: (href: string) => void }) {
  try {
    sessionStorage.setItem(MEMORY_OPEN_KEY, '1');
  } catch {
    // Without session storage the Memory page still opens; the form is one click away.
  }
  router.push('/memory');
  window.dispatchEvent(new Event(MEMORY_OPEN_EVENT));
}
