import type { ReactNode } from 'react'
import styles from './CompanyContent.module.css'

/**
 * Canonical content boundary for Company OS modules.
 * Module selection and business data remain outside the presentation shell.
 */
export default function CompanyContent({ children }: { children: ReactNode }) {
  return <section className={styles.content} data-company-content="true">{children}</section>
}
