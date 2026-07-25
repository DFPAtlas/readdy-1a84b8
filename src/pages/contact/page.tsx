import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '@/components/feature/PublicNavbar';
import Footer from '@/components/feature/Footer';

const FORM_SUBMIT_URL = 'https://readdy.ai/api/form/d9aofu881gss20ku93rg';

export default function ContactPage() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const honeypot = (form.querySelector('[name="phone_alt"]') as HTMLInputElement)?.value?.trim();
    if (honeypot) {
      setStatus('success');
      form.reset();
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const formData = new FormData(form);
      const response = await fetch(FORM_SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData as unknown as Record<string, string>).toString(),
      });
      const responseText = await response.text();
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(responseText); } catch { /* ignore */ }

      if (response.ok && parsed?.code === 'OK') {
        setStatus('success');
        form.reset();
      } else {
        const serverMsg = (parsed?.meta as Record<string, string>)?.message || responseText || 'Something went wrong. Please try again.';
        if (typeof serverMsg === 'string' && serverMsg.toLowerCase().includes('spam')) {
          setErrorMessage('Your message could not be sent. Please try again.');
        } else {
          setErrorMessage(typeof serverMsg === 'string' ? serverMsg : 'Something went wrong. Please try again.');
        }
        setStatus('error');
      }
    } catch {
      setErrorMessage('A network error occurred. Please check your connection and try again.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-background-50">
      <PublicNavbar transparent={false} />
      <main className="pt-20 md:pt-24">
        {/* Hero */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-0 items-stretch rounded-2xl overflow-hidden border border-secondary-100">
              {/* Left — text with background image */}
              <div className="w-full lg:w-1/2 relative min-h-[400px] md:min-h-[500px] flex items-end">
                <img
                  src="https://storage.readdy-site.link/project_files/db465b55-2978-4a6e-8202-84a3a77c69f8/c3680c9c-b07d-431c-a765-e22a03260722_compressed_36_20230222190453_5449968_large.webp"
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover object-top"
                  aria-hidden="true"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="relative p-8 md:p-12">
                  <span className="inline-block text-xs font-label font-medium tracking-wider uppercase text-white/80 mb-3">Contact</span>
                  <h1 className="font-heading text-4xl md:text-5xl text-white mt-1 leading-tight">
                    We would love<br />
                    <em className="font-light italic">to hear from you</em>
                  </h1>
                  <p className="text-white/80 text-base mt-4 max-w-sm">
                    Whether you have a question about Wedora, want to share feedback or need help with your wedding planning, send us a message and we will get back to you.
                  </p>
                </div>
              </div>

              {/* Right — form */}
              <div className="w-full lg:w-1/2 bg-white p-8 md:p-12">
                <div className="card-default border-0 shadow-none p-0">
                  {status === 'success' ? (
                    <div className="py-12 text-center">
                      <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-accent-100 text-accent-600 mb-4">
                        <i className="ri-check-line text-2xl" />
                      </div>
                      <h3 className="font-heading text-xl text-foreground-900 mb-2">Message sent</h3>
                      <p className="text-sm text-foreground-600">Thank you for reaching out. We will get back to you as soon as possible.</p>
                      <button
                        onClick={() => setStatus('idle')}
                        className="btn-outline mt-6 cursor-pointer"
                      >
                        Send another message
                      </button>
                    </div>
                  ) : (
                    <form ref={formRef} onSubmit={handleSubmit} data-readdy-form="" noValidate>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="contact-name" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                            Name <span className="text-primary-500">*</span>
                          </label>
                          <input
                            id="contact-name"
                            name="name"
                            type="text"
                            required
                            className="input-field"
                            placeholder="Your full name"
                          />
                        </div>

                        <div>
                          <label htmlFor="contact-email" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                            Email <span className="text-primary-500">*</span>
                          </label>
                          <input
                            id="contact-email"
                            name="email"
                            type="email"
                            required
                            className="input-field"
                            placeholder="your@email.com"
                          />
                        </div>

                        <div>
                          <label htmlFor="contact-subject" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                            Subject <span className="text-primary-500">*</span>
                          </label>
                          <select
                            id="contact-subject"
                            name="subject"
                            required
                            className="input-field cursor-pointer"
                          >
                            <option value="">Select a topic</option>
                            <option value="General enquiry">General enquiry</option>
                            <option value="Privacy request">Privacy request — access, correction or deletion</option>
                            <option value="Support">Technical support</option>
                            <option value="Feedback">Feedback or suggestion</option>
                            <option value="Partnership">Partnership or press</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="contact-message" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                            Message <span className="text-primary-500">*</span>
                          </label>
                          <textarea
                            id="contact-message"
                            name="message"
                            required
                            rows={5}
                            maxLength={500}
                            className="input-field resize-none"
                            placeholder="Tell us more about your query..."
                          />
                          <p className="text-xs text-foreground-400 mt-1">Maximum 500 characters</p>
                        </div>

                        <div>
                          <label htmlFor="contact-wedding-date" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                            Wedding date <span className="text-foreground-400">(optional)</span>
                          </label>
                          <input
                            id="contact-wedding-date"
                            name="wedding_date"
                            type="date"
                            className="input-field"
                          />
                        </div>

                        {/* Honeypot */}
                        <div className="form-hp-field">
                          <label htmlFor="contact-hp">Phone</label>
                          <input id="contact-hp" name="phone_alt" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" readOnly />
                        </div>

                        <div className="flex items-start gap-2">
                          <input
                            id="contact-consent"
                            name="consent"
                            type="checkbox"
                            required
                            className="mt-1 w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400 cursor-pointer"
                          />
                          <label htmlFor="contact-consent" className="text-xs text-foreground-600 leading-relaxed cursor-pointer">
                            I agree to Wedora processing my personal data in accordance with the <Link to="/privacy" className="text-primary-600 underline">Privacy Policy</Link>. <span className="text-primary-500">*</span>
                          </label>
                        </div>

                        {status === 'error' && errorMessage && (
                          <div className="p-3 rounded-md bg-primary-50 border border-primary-200 text-sm text-primary-800">
                            {errorMessage}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={status === 'submitting'}
                          className="btn-primary w-full cursor-pointer disabled:opacity-50"
                        >
                          {status === 'submitting' ? 'Sending...' : 'Send message'}
                        </button>

                        <p className="text-xs text-foreground-400 text-center mt-3">
                          Email delivery requires configuration. Your message will be stored securely.
                        </p>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}