import { useState } from 'react';
import { localData } from '../../../localData.js';
import { STATUS } from '../../../format.js';
import { Button, Card, Field, FormError, List, Select, StatusChip, useAction } from '../../../components/ui.jsx';

export default function PhaseEditor({ phase, reload }) {
  const [values, setValues] = useState({
    status: phase.status,
    start_date: phase.start_date || '',
    end_date: phase.end_date || '',
  });
  const [itemName, setItemName] = useState('');
  const { busy, err, run } = useAction();
  const save = (event) => {
    event.preventDefault();
    run(async () => {
      await localData(`/admin/phases/${phase.id}`, { method: 'PATCH', body: values });
      reload();
    }, 'تم حفظ المرحلة');
  };
  const addItem = (event) => {
    event.preventDefault();
    run(async () => {
      await localData(`/admin/phases/${phase.id}/items`, { method: 'POST', body: { name: itemName } });
      setItemName('');
      reload();
    }, 'تمت إضافة البند');
  };
  const setItemStatus = (item, status) => run(async () => {
    await localData(`/admin/items/${item.id}`, { method: 'PATCH', body: { status } });
    reload();
  }, 'تم تحديث حالة البند');

  return (
    <Card title={phase.name} actions={<StatusChip s={phase.status} />}>
      <form onSubmit={save} className="form-grid">
        <Field label="الحالة">
          <Select
            value={values.status}
            onChange={(status) => setValues({ ...values, status })}
            options={Object.entries(STATUS).map(([value, label]) => ({ value, label }))}
          />
        </Field>
        <Field label="من"><input type="date" value={values.start_date} onChange={(event) => setValues({ ...values, start_date: event.target.value })} /></Field>
        <Field label="إلى"><input type="date" value={values.end_date} onChange={(event) => setValues({ ...values, end_date: event.target.value })} /></Field>
        <div className="flex items-end">
          <Button size="small" loading={busy} disabled={busy}>حفظ المرحلة</Button>
        </div>
      </form>
      <List>
        {phase.items.map((item) => (
          <div key={item.id} className="item">
            <div className="row between">
              <span>{item.name}</span>
              <span className="row">
                <StatusChip s={item.status} />
                {['next', 'current', 'done'].filter((status) => status !== item.status).map((status) => (
                  <Button key={status} variant="secondary" size="small" disabled={busy} onClick={() => setItemStatus(item, status)}>
                    {STATUS[status]}
                  </Button>
                ))}
              </span>
            </div>
          </div>
        ))}
      </List>
      <form onSubmit={addItem} className="row">
        <input type="text" className="grow" placeholder="بند جديد في هذه المرحلة" aria-label="بند جديد" value={itemName} onChange={(event) => setItemName(event.target.value)} />
        <Button size="small" loading={busy} disabled={busy || !itemName.trim()}>إضافة بند</Button>
      </form>
      <FormError message={err} />
    </Card>
  );
}
