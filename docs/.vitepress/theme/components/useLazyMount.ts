import { onMounted, onBeforeUnmount, ref } from 'vue';
import type { Ref } from 'vue';

/**
 * Mount the canvas only while the host element is near the viewport, and
 * unmount it again once it scrolls far away. Browsers cap WebGL contexts at
 * ~16 per tab; with > 6 demos on a page, scrolling through all of them
 * triggers context-loss on the oldest ones unless we tear them down on exit.
 *
 * The `rootMargin` of 600px gives a generous buffer so smooth scrolling
 * always finds the next demo already mounted.
 *
 * Usage in a Vue setup:
 *   const root = useTemplateRef<HTMLElement>('root');
 *   const { active } = useLazyMount(root);
 *   // <div ref="root"><TresCanvas v-if="active">…</TresCanvas></div>
 */
export function useLazyMount(target: Ref<HTMLElement | null>): { active: Ref<boolean> } {
  const active = ref(false);
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    if (typeof IntersectionObserver === 'undefined' || !target.value) {
      // SSR-only path or no IO support → mount eagerly.
      active.value = true;
      return;
    }
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          active.value = entry.isIntersecting;
        }
      },
      { rootMargin: '600px' },
    );
    observer.observe(target.value);
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
  });

  return { active };
}
