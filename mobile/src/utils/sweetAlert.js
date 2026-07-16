import { createRef } from 'react';

export const sweetAlertRef = createRef();

export function sweetAlert({ title, text, type = 'success', showCancel = false, onConfirm = null }) {
  if (sweetAlertRef.current) {
    sweetAlertRef.current.show({ title, text, type, showCancel, onConfirm });
  }
}
