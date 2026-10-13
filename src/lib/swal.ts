import Swal, { SweetAlertOptions, SweetAlertResult } from 'sweetalert2';

export const showTipTipAlert = (options: SweetAlertOptions): Promise<SweetAlertResult> => {
  return Swal.fire({
    ...options,
    customClass: {
      popup: 'swal-tiptip-popup',
      title: 'swal-tiptip-title',
      htmlContainer: 'swal-tiptip-html',
      confirmButton: 'swal-tiptip-confirm',
      cancelButton: 'swal-tiptip-cancel',
      ...options.customClass,
    },
    buttonsStyling: false,
    background: '#121816',
    color: '#F7FAF8',
  });
};

export const showSuccessNotification = (title: string, message: string) => {
  return showTipTipAlert({
    icon: 'success',
    title,
    text: message,
    confirmButtonText: 'Great!',
    iconColor: '#10B981',
  });
};

export const showErrorNotification = (title: string, message: string) => {
  return showTipTipAlert({
    icon: 'error',
    title,
    text: message,
    confirmButtonText: 'Acknowledge',
    iconColor: '#EF4444',
  });
};

export const showConfirmModal = (title: string, message: string, confirmText = 'Confirm') => {
  return showTipTipAlert({
    title,
    text: message,
    icon: 'question',
    iconColor: '#34D399',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancel',
  });
};
