'use client';

import CopyBrief from '@/components/CopyBrief';
import { useToast } from '@/components/ui';

export default function CopyWriting() {
  const [toast, show] = useToast();
  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <span className="ui-label">Copy writing</span>
          <h1 className="ui-h1">Write your first sequence.</h1>
          <p className="ui-sub">Answer 9 quick questions and get cold emails written the way that books meetings.</p>
        </div>
      </div>
      <CopyBrief onToast={show} />
      {toast}
    </>
  );
}
