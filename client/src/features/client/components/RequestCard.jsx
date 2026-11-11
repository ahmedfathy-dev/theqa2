import { useState } from 'react';
import { localData } from '../../../localData.js';
import { KIND } from '../../../format.js';
import { Button, Card, ChoiceGroup, Chip, FormError, useAction } from '../../../components/ui.jsx';

export default function RequestCard({ request, onDone }) {
  const [answer, setAnswer] = useState('');
  const { busy, err, run } = useAction();
  const send = (value) => run(async () => {
    await localData(`/client/requests/${request.id}/answer`, { method: 'POST', body: { answer: value } });
    onDone();
  }, 'تم إرسال ردك');

  return (
    <Card hl={request.status === 'open'}>
      <div className="row between">
        <h2>{request.title}</h2>
        <Chip tone={request.status === 'open' ? 'amber' : 'green'}>
          {request.status === 'open' ? KIND[request.kind] : 'تم'}
        </Chip>
      </div>
      {request.description && <p className="muted">{request.description}</p>}
      {request.status === 'done' ? <span className="ok">ردّك: {request.answer}</span> : (
        <div className="col">
          {request.kind === 'decision' && (
            <>
              <ChoiceGroup
                name={request.id}
                ariaLabel={request.title}
                value={answer}
                onChange={setAnswer}
                options={(request.options || []).map((option) => ({ value: option.label, label: option.label }))}
              />
              <div className="flex items-center justify-end pt-2">
                <Button loading={busy} disabled={busy || !answer} onClick={() => send(answer)}>تأكيد القرار</Button>
              </div>
            </>
          )}
          {request.kind === 'content' && (
            <>
              <textarea rows={3} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="اكتب المحتوى أو ضع رابطا" aria-label="الرد" />
              <div className="flex items-center justify-end pt-2">
                <Button loading={busy} disabled={busy || !answer.trim()} onClick={() => send(answer)}>إرسال</Button>
              </div>
            </>
          )}
          {request.kind === 'approval' && (
            <div className="flex items-center justify-end pt-2">
              <Button loading={busy} disabled={busy} onClick={() => send('')}>اعتماد</Button>
            </div>
          )}
          <FormError message={err} />
        </div>
      )}
    </Card>
  );
}
