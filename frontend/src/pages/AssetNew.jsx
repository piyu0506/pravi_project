import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useNotify } from '../context/NotificationContext';
import { CATEGORIES, LIFECYCLE_STATUSES } from '../constants';

function emptyForm() {
  return {
    assetId: '',
    name: '',
    category: 'IT',
    type: '',
    description: '',
    ownerDepartment: '',
    ownerOrganization: '',
    state: '',
    city: '',
    latitude: '',
    longitude: '',
    purchaseDate: '',
    purchaseCost: '',
    vendor: '',
    warrantyEnd: '',
    lifecycleStatus: 'PURCHASED',
    installationDate: '',
    expectedLifeYears: '',
    specifications: '',
  };
}

function buildPayload(form) {
  const payload = {
    assetId: form.assetId.trim(),
    name: form.name.trim() || undefined,
    category: form.category || undefined,
    type: form.type.trim() || undefined,
    description: form.description.trim() || undefined,
    owner: {
      department: form.ownerDepartment.trim() || undefined,
      organization: form.ownerOrganization.trim() || undefined,
    },
    location: {
      state: form.state.trim() || undefined,
      city: form.city.trim() || undefined,
      latitude: form.latitude === '' ? undefined : Number(form.latitude),
      longitude: form.longitude === '' ? undefined : Number(form.longitude),
    },
    procurement: {
      purchaseDate: form.purchaseDate || undefined,
      purchaseCost: form.purchaseCost === '' ? undefined : Number(form.purchaseCost),
      vendor: form.vendor.trim() || undefined,
      warrantyEnd: form.warrantyEnd || undefined,
    },
    lifecycle: {
      status: form.lifecycleStatus || undefined,
      installationDate: form.installationDate || undefined,
      expectedLifeYears: form.expectedLifeYears === '' ? undefined : Number(form.expectedLifeYears),
    },
  };
  if (form.specifications.trim()) {
    payload.specifications = JSON.parse(form.specifications);
  }
  return payload;
}

export function AssetFields({ form, setForm }) {
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  return (
    <div className="form-grid">
      <label>Asset ID<input required value={form.assetId} onChange={set('assetId')} /></label>
      <label>Name<input value={form.name} onChange={set('name')} /></label>
      <label>Category
        <select value={form.category} onChange={set('category')}>
          {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>Type<input value={form.type} onChange={set('type')} /></label>
      <label className="wide">Description<textarea value={form.description} onChange={set('description')} rows={3} /></label>
      <label>Owner department<input value={form.ownerDepartment} onChange={set('ownerDepartment')} /></label>
      <label>Owner organization<input value={form.ownerOrganization} onChange={set('ownerOrganization')} /></label>
      <label>City<input value={form.city} onChange={set('city')} /></label>
      <label>State<input value={form.state} onChange={set('state')} /></label>
      <label>Latitude<input type="number" value={form.latitude} onChange={set('latitude')} /></label>
      <label>Longitude<input type="number" value={form.longitude} onChange={set('longitude')} /></label>
      <label>Purchase date<input type="date" value={form.purchaseDate} onChange={set('purchaseDate')} /></label>
      <label>Purchase cost<input type="number" min="0" value={form.purchaseCost} onChange={set('purchaseCost')} /></label>
      <label>Vendor<input value={form.vendor} onChange={set('vendor')} /></label>
      <label>Warranty end<input type="date" value={form.warrantyEnd} onChange={set('warrantyEnd')} /></label>
      <label>Lifecycle status
        <select value={form.lifecycleStatus} onChange={set('lifecycleStatus')}>
          {LIFECYCLE_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>Installation date<input type="date" value={form.installationDate} onChange={set('installationDate')} /></label>
      <label>Expected life (years)<input type="number" min="0" value={form.expectedLifeYears} onChange={set('expectedLifeYears')} /></label>
      <label className="wide">Specifications (JSON)<textarea value={form.specifications} onChange={set('specifications')} rows={4} placeholder='{"capacity": "500 kVA"}' /></label>
    </div>
  );
}

export default function AssetNew() {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const notify = useNotify();
  const navigate = useNavigate();

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = buildPayload(form);
      if (form.specifications.trim()) {
        JSON.parse(form.specifications);
      }
      const response = await api.createAsset(payload);
      notify.success('Asset created.');
      navigate(`/assets/${response.data._id}`);
    } catch (error) {
      notify.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Register</p>
          <h1>Add asset</h1>
        </div>
        <Link className="btn" to="/assets">Back to inventory</Link>
      </div>
      <form className="card stack" onSubmit={onSubmit}>
        <AssetFields form={form} setForm={setForm} />
        <div className="modal-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create asset'}</button>
        </div>
      </form>
    </div>
  );
}

export function assetToForm(asset) {
  return {
    assetId: asset.assetId || '',
    name: asset.name || '',
    category: asset.category || 'IT',
    type: asset.type || '',
    description: asset.description || '',
    ownerDepartment: asset.owner?.department || '',
    ownerOrganization: asset.owner?.organization || '',
    state: asset.location?.state || '',
    city: asset.location?.city || '',
    latitude: asset.location?.latitude ?? '',
    longitude: asset.location?.longitude ?? '',
    purchaseDate: asset.procurement?.purchaseDate ? String(asset.procurement.purchaseDate).slice(0, 10) : '',
    purchaseCost: asset.procurement?.purchaseCost ?? '',
    vendor: asset.procurement?.vendor || '',
    warrantyEnd: asset.procurement?.warrantyEnd ? String(asset.procurement.warrantyEnd).slice(0, 10) : '',
    lifecycleStatus: asset.lifecycle?.status || 'PURCHASED',
    installationDate: asset.lifecycle?.installationDate ? String(asset.lifecycle.installationDate).slice(0, 10) : '',
    expectedLifeYears: asset.lifecycle?.expectedLifeYears ?? '',
    specifications: asset.specifications ? JSON.stringify(asset.specifications, null, 2) : '',
  };
}

export { buildPayload };
