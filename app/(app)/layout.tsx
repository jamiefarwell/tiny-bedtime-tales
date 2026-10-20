import { BottomNav } from '@/components/BottomNav';
import styles from './shell.module.css';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className={styles.shell}>{children}</div>
      <BottomNav />
    </>
  );
}
