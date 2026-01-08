import React from 'react';

export default function ConfirmModal({ isOpen, title = 'Confirmar', message = '¿Estás seguro?', onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div className="confirm-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="confirm-modal-contenido">
        <h3 className="confirm-title">{title}</h3>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button className="confirm-btn confirm-ok" onClick={onConfirm}>Confirmar</button>
          <button className="confirm-btn confirm-cancel" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
