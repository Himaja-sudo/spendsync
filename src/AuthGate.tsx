import { useState, type ReactNode } from 'react';

// Sample, front-end-only login for prototype testing.
// NOT real authentication: these credentials are visible to anyone who views the page source.
const SAMPLE_ID = 'demo@spendsync.app';
const SAMPLE_PW = 'Demo@1234';
const SESSION_KEY = 'spendsync-session';

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (id.trim().toLowerCase() === SAMPLE_ID && pw === SAMPLE_PW) {
      onLogin();
    } else {
      setErr('Incorrect login ID or password. Use the sample login shown below.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl border-3 border-black shadow-[6px_6px_0px_0px_#000] overflow-hidden">
        <div className="bg-[#bbf7d0] border-b-3 border-black px-4 py-2.5 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#f43f5e] border-2 border-black inline-block"></span>
          <span className="w-3 h-3 rounded-full bg-[#fde047] border-2 border-black inline-block"></span>
          <span className="w-3 h-3 rounded-full bg-[#22c55e] border-2 border-black inline-block"></span>
          <span className="text-xs font-black uppercase tracking-wider ml-2">SPENDSYNC LOGIN</span>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4 text-xs font-bold">
          <div className="text-3xl font-black tracking-tight uppercase flex items-center gap-1">
            <span>spendsync</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#ec4899] border-2 border-black inline-block mb-1"></span>
          </div>
          <p className="text-slate-600">Sign in to open the prototype dashboard.</p>

          <div>
            <label htmlFor="login-id" className="block text-black font-black mb-1">Login ID</label>
            <input
              id="login-id"
              type="text"
              autoComplete="username"
              value={id}
              onChange={(e) => { setId(e.target.value); setErr(''); }}
              placeholder="demo@spendsync.app"
              className="w-full p-2.5 bg-[#f8fafc] rounded-xl border-2 border-black outline-none font-bold shadow-[2px_2px_0px_0px_#000]"
            />
          </div>

          <div>
            <label htmlFor="login-pw" className="block text-black font-black mb-1">Password</label>
            <div className="flex gap-2">
              <input
                id="login-pw"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={pw}
                onChange={(e) => { setPw(e.target.value); setErr(''); }}
                placeholder="••••••••"
                className="w-full p-2.5 bg-[#f8fafc] rounded-xl border-2 border-black outline-none font-mono font-bold shadow-[2px_2px_0px_0px_#000]"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="neo-btn px-3 rounded-xl bg-white border-2 border-black font-black cursor-pointer"
              >
                {show ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>

          {err && (
            <div role="alert" className="p-2.5 rounded-xl border-2 border-black bg-[#fca5a5] font-black text-rose-950">
              {err}
            </div>
          )}

          <button
            type="submit"
            className="neo-btn w-full py-2.5 rounded-xl bg-[#ec4899] text-white text-sm font-black border-2 border-black cursor-pointer"
          >
            LOG IN
          </button>

          <div className="p-3 rounded-xl border-2 border-black bg-[#fde047] space-y-1.5">
            <div className="font-black uppercase">Sample login (for testers)</div>
            <div>ID: <span className="font-mono font-black">{SAMPLE_ID}</span></div>
            <div>Password: <span className="font-mono font-black">{SAMPLE_PW}</span></div>
            <button
              type="button"
              onClick={() => { setId(SAMPLE_ID); setPw(SAMPLE_PW); setErr(''); }}
              className="neo-btn mt-1 px-3 py-1 rounded-lg bg-white border-2 border-black font-black cursor-pointer"
            >
              FILL SAMPLE LOGIN
            </button>
          </div>

          <p className="text-[11px] text-slate-600">
            Demo only: this is a front-end sample login, not real authentication. The credentials are public and no
            account or personal data is involved. Please don’t reuse a real password here.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean>(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
  });

  const login = () => {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
    setAuthed(true);
  };
  const logout = () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    setAuthed(false);
  };

  if (!authed) return <LoginPage onLogin={login} />;

  return (
    <>
      {children}
      <button
        onClick={logout}
        className="neo-btn fixed bottom-4 right-4 z-50 px-4 py-2 rounded-xl bg-white text-black text-xs font-black border-2 border-black cursor-pointer"
      >
        LOG OUT
      </button>
    </>
  );
}
