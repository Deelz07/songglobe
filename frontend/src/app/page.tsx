// src/app/page.tsx
import Globe from '../components/Globe';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Interactive Globe</h1>
      <div className={styles.globeContainer}>
        <Globe />
      </div>
    </div>
  );
}