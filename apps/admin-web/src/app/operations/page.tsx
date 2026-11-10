'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OperationsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/bookings');
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
