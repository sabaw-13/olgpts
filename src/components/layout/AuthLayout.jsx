import { BookOpen, ClipboardList, ReceiptText } from 'lucide-react';
import './AuthLayout.css';

function AuthLayout({ children }) {
  return (
    <main className="school-login">
      <div className="school-login__shell">
        <aside className="school-login__identity" aria-label="Our Lady of Guadalupe Tibiao Parochial School">
          <div className="school-login__brand">
            <img src="/logo.png" alt="School crest" width="76" height="76" />
            <div><p className="school-login__initials">OLGTPS</p><p className="school-login__brand-caption">School administration</p></div>
          </div>
          <div className="school-login__introduction">
            <div className="school-login__gold-rule" aria-hidden="true" />
            <h2>Our Lady of Guadalupe<br />Tibiao Parochial School</h2>
            <p>A place for every student.<br />One place for their school records.</p>
          </div>
          <ul className="school-login__workflows" aria-label="School management tools">
            <li><BookOpen size={19} aria-hidden="true" /><span>Student enrollment</span></li>
            <li><ClipboardList size={19} aria-hidden="true" /><span>Fee assessment</span></li>
            <li><ReceiptText size={19} aria-hidden="true" /><span>Payment records</span></li>
          </ul>
          <img className="school-login__watermark" src="/logo.png" alt="" aria-hidden="true" />
        </aside>
        <section className="school-login__panel" aria-label="Sign in to your school account">
          <div className="school-login__mobile-brand">
            <img src="/logo.png" alt="OLGTPS school crest" width="48" height="48" />
            <div><strong>OLGTPS</strong><span>School administration</span></div>
          </div>
          <div className="school-login__content">{children}</div>
          <p className="school-login__help">Need help with your account? Contact the school administrator.</p>
        </section>
      </div>
    </main>
  );
}

export default AuthLayout;
