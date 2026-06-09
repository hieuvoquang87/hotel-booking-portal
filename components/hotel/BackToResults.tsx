'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/Icon';

export function BackToResults() {
  const router = useRouter();

  function handleClick() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  }

  return (
    <Button variant="link" onClick={handleClick}>
      <Icon name="chevron" size={16} className="rotate-90" />
      Back to results
    </Button>
  );
}
