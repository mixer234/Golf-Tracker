import { useToastContext, ToastOptions } from '../components/feedback/Toast';

export function useToast() {
  const { showToast } = useToastContext();
  return { showToast };
}
