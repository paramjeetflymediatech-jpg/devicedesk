"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FiTerminal, FiDownload, FiCheckCircle, FiCopy, FiInfo,
  FiArrowLeft, FiShield, FiCpu, FiExternalLink, FiHelpCircle
} from 'react-icons/fi';
import { FaWindows, FaUbuntu, FaApple } from 'react-icons/fa';

export default function SetupAgentPage() {
  const [activeTab, setActiveTab] = useState('ubuntu'); // 'windows' | 'ubuntu' | 'mac'
  const [copiedCmd, setCopiedCmd] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary, #0a0b10)',
      color: 'var(--text-primary, #f3f4f6)',
      fontFamily: 'var(--font-main, sans-serif)',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>

        {/* Top Header Navigation */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <Link
            href="/"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)', fontWeight: '700', fontSize: '0.9rem', backgroundColor: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}
          >
            <FiArrowLeft /> Back to Portal
          </Link>
        </div>

        {/* Hero Title Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(2,132,199,0.06) 100%)',
          border: '1px solid var(--glass-border)',
          borderRadius: '20px',
          padding: '40px 32px',
          marginBottom: '36px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '18px', backgroundColor: 'var(--accent-blue)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', boxShadow: '0 4px 14px rgba(37,99,235,0.4)' }}>
              <FiTerminal />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '2.4rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.2' }}>
                Desktop Activity Agent <br /> Complete Setup Guide
              </h1>
              <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '1rem' }}>
                Step-by-step installation instructions, terminal commands, and expected outputs for Windows, Ubuntu Linux, and macOS.
              </p>
            </div>
          </div>

          {/* Quick Direct Download Bar (.zip only) */}
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', width: '100%' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Direct Download Packages (.zip):</span>

            <a
              href="/download/DeviceDeskAgent-Portable.zip"
              download="DeviceDeskAgent-Portable.zip"
              style={{ textDecoration: 'none', backgroundColor: '#2563eb', color: '#ffffff', padding: '9px 16px', borderRadius: '10px', fontWeight: '700', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}
            >
              <FaWindows style={{ fontSize: '1rem' }} /> Windows (.zip)
            </a>

            <a
              href="/download/DeviceDeskAgent-Linux.zip"
              download="DeviceDeskAgent-Linux.zip"
              style={{ textDecoration: 'none', backgroundColor: '#e05206', color: '#ffffff', padding: '9px 16px', borderRadius: '10px', fontWeight: '700', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(224,82,6,0.3)' }}
            >
              <FaUbuntu style={{ fontSize: '1rem' }} /> Ubuntu (.zip)
            </a>

            <a
              href="/download/DeviceDeskAgent-Mac.zip"
              download="DeviceDeskAgent-Mac.zip"
              style={{ textDecoration: 'none', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '9px 16px', borderRadius: '10px', fontWeight: '700', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid var(--glass-border)' }}
            >
              <FaApple style={{ fontSize: '1.05rem' }} /> macOS (.zip)
            </a>
          </div>
        </div>

        {/* Operating System Selector Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '28px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
          <button
            onClick={() => setActiveTab('ubuntu')}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: activeTab === 'ubuntu' ? '1px solid #e05206' : '1px solid var(--glass-border)',
              backgroundColor: activeTab === 'ubuntu' ? '#e05206' : 'var(--bg-secondary)',
              color: activeTab === 'ubuntu' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: '800',
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: activeTab === 'ubuntu' ? '0 4px 14px rgba(224,82,6,0.35)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <FaUbuntu style={{ fontSize: '1.2rem' }} /> Ubuntu / Linux (.zip)
          </button>

          <button
            onClick={() => setActiveTab('mac')}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: activeTab === 'mac' ? '1px solid var(--accent-blue)' : '1px solid var(--glass-border)',
              backgroundColor: activeTab === 'mac' ? 'var(--accent-blue)' : 'var(--bg-secondary)',
              color: activeTab === 'mac' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: '800',
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: activeTab === 'mac' ? '0 4px 14px rgba(37,99,235,0.35)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <FaApple style={{ fontSize: '1.2rem' }} /> macOS (.zip)
          </button>

          <button
            onClick={() => setActiveTab('windows')}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: activeTab === 'windows' ? '1px solid #2563eb' : '1px solid var(--glass-border)',
              backgroundColor: activeTab === 'windows' ? '#2563eb' : 'var(--bg-secondary)',
              color: activeTab === 'windows' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: '800',
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: activeTab === 'windows' ? '0 4px 14px rgba(37,99,235,0.35)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <FaWindows style={{ fontSize: '1.1rem' }} /> Windows (.zip)
          </button>
        </div>

        {/* SECTION 1: UBUNTU / LINUX SETUP GUIDE */}
        {activeTab === 'ubuntu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#e05206', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaUbuntu /> Step 1: Download & Extract Archive
                </h3>
                <span style={{ fontSize: '0.78rem', backgroundColor: 'rgba(224,82,6,0.15)', color: '#e05206', padding: '4px 10px', borderRadius: '8px', fontWeight: '700' }}>
                  Target File: DeviceDeskAgent-Linux.zip
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '14px', lineHeight: '1.6' }}>
                Open Terminal (<code>Ctrl + Alt + T</code>) and download the ZIP package directly via <code>wget</code>, then extract it into your home directory:
              </p>

              {/* Command Block */}
              <CodeBlock
                cmd={`wget https://devicedesk.flymediatech.com/download/DeviceDeskAgent-Linux.zip -O ~/Downloads/DeviceDeskAgent-Linux.zip\nunzip ~/Downloads/DeviceDeskAgent-Linux.zip -d ~/DeviceDeskAgent\ncd ~/DeviceDeskAgent`}
                id="ub-step1"
                copiedCmd={copiedCmd}
                copyToClipboard={copyToClipboard}
              />

              {/* Terminal Output Output Preview */}
              <TerminalOutput
                title="Terminal Output (Extraction Log):"
                output={`--2026-08-10 17:45:12--  https://devicedesk.flymediatech.com/download/DeviceDeskAgent-Linux.zip
Resolving localhost (localhost)... 127.0.0.1
Connecting to localhost (localhost)|127.0.0.1|:3000... connected.
HTTP request sent, awaiting response... 200 OK
Length: 99749124 (95M) [application/zip]
Saving to: ‘/home/user/Downloads/DeviceDeskAgent-Linux.zip’

100%[======================================>] 99,749,124   185MB/s   in 0.5s

Archive:  /home/user/Downloads/DeviceDeskAgent-Linux.zip
  creating: /home/user/DeviceDeskAgent/
 extracting: /home/user/DeviceDeskAgent/DeviceDeskAgent
 extracting: /home/user/DeviceDeskAgent/config.json
 inflating: /home/user/DeviceDeskAgent/libffmpeg.so
SUCCESS: 3 files extracted to /home/user/DeviceDeskAgent`}
              />
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '28px' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '1.2rem', fontWeight: '800', color: '#e05206', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaUbuntu /> Step 2: Grant Executable Permissions
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '14px', lineHeight: '1.6' }}>
                Linux requires explicit permission to execute downloaded binary files. Run <code>chmod +x</code> on the agent binary:
              </p>

              <CodeBlock
                cmd={`chmod +x DeviceDeskAgent\nls -la DeviceDeskAgent`}
                id="ub-step2"
                copiedCmd={copiedCmd}
                copyToClipboard={copyToClipboard}
              />

              <TerminalOutput
                title="Terminal Output (Permissions Verified):"
                output={`$ chmod +x DeviceDeskAgent
$ ls -la DeviceDeskAgent
-rwxr-xr-x 1 user user 99749124 Aug 10 17:45 DeviceDeskAgent
✓ Executable flag (-rwxr-xr-x) assigned cleanly.`}
              />
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '28px' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '1.2rem', fontWeight: '800', color: '#e05206', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaUbuntu /> Step 3: Run the Agent & Authenticate
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '14px', lineHeight: '1.6' }}>
                Start the application binary. The interactive CLI will prompt for your Employee Credentials and pair your desktop automatically:
              </p>

              <CodeBlock
                cmd={`./DeviceDeskAgent`}
                id="ub-step3"
                copiedCmd={copiedCmd}
                copyToClipboard={copyToClipboard}
              />

              <TerminalOutput
                title="Terminal Output (Live Execution & Pairing Log):"
                output={`[DeviceDesk Agent v2.4.0 - Linux 64-bit]
[Network] Server endpoint: https://devicedesk.flymediatech.com
[Auth] Employee Credentials verified: aman@yopmail.com (Aman - ID: emp14)
[System] Registered hostname: UBUNTU-PC-01 | IP: 192.168.1.42
[Sync] Initializing background activity monitor...
[Status] Heartbeat pulse active (interval: 30s)
[Monitor] Screen capture scheduled every 3 minutes.
✓ DeviceDesk Agent is running active in background.`}
              />
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '28px' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '1.2rem', fontWeight: '800', color: '#e05206', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaUbuntu /> Step 4 (Optional): Enable Auto-Start on Boot
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '14px', lineHeight: '1.6' }}>
                Create a GNOME autostart entry so the agent automatically runs whenever you log into your Ubuntu desktop:
              </p>

              <CodeBlock
                cmd={`mkdir -p ~/.config/autostart\ncat <<EOT > ~/.config/autostart/devicedesk-agent.desktop\n[Desktop Entry]\nType=Application\nExec=$HOME/DeviceDeskAgent/DeviceDeskAgent\nHidden=false\nNoDisplay=false\nX-GNOME-Autostart-enabled=true\nName=DeviceDesk Agent\nComment=Automated Desktop Activity Monitoring\nEOT`}
                id="ub-step4"
                copiedCmd={copiedCmd}
                copyToClipboard={copyToClipboard}
              />

              <TerminalOutput
                title="Terminal Output (Autostart Entry Created):"
                output={`Created file: /home/user/.config/autostart/devicedesk-agent.desktop
✓ DeviceDesk Agent will now launch automatically on Ubuntu user login.`}
              />
            </div>
          </div>
        )}

        {/* SECTION 2: macOS SETUP GUIDE */}
        {activeTab === 'mac' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '28px' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '1.2rem', fontWeight: '800', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaApple /> Step 1: Download & Extract Finder App
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '14px', lineHeight: '1.6' }}>
                Click <strong>macOS (.zip)</strong> to download <code>DeviceDeskAgent-Mac.zip</code>, then extract it to your Applications folder:
              </p>

              <CodeBlock
                cmd={`curl -O https://devicedesk.flymediatech.com/download/DeviceDeskAgent-Mac.zip\nunzip DeviceDeskAgent-Mac.zip -d /Applications/`}
                id="mac-step1"
                copiedCmd={copiedCmd}
                copyToClipboard={copyToClipboard}
              />

              <TerminalOutput
                title="Terminal Output (macOS Extraction Log):"
                output={`% Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 95.1M  100 95.1M    0     0   180M      0 --:--:-- --:--:-- --:--:--  180M

Archive:  DeviceDeskAgent-Mac.zip
   creating: /Applications/DeviceDeskAgent.app/
   creating: /Applications/DeviceDeskAgent.app/Contents/
  inflating: /Applications/DeviceDeskAgent.app/Contents/MacOS/DeviceDeskAgent
SUCCESS: Application extracted to /Applications/DeviceDeskAgent.app`}
              />
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '28px' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '1.2rem', fontWeight: '800', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaApple /> Step 2: Clear macOS Gatekeeper Quarantine
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '14px', lineHeight: '1.6' }}>
                macOS automatically flags non-AppStore zip downloads with a quarantine attribute. Clear it via Terminal:
              </p>

              <CodeBlock
                cmd={`sudo xattr -rd com.apple.quarantine /Applications/DeviceDeskAgent.app`}
                id="mac-step2"
                copiedCmd={copiedCmd}
                copyToClipboard={copyToClipboard}
              />

              <TerminalOutput
                title="Terminal Output (Gatekeeper Cleared):"
                output={`Password: **********
Cleared extended attribute 'com.apple.quarantine' for /Applications/DeviceDeskAgent.app.
✓ macOS Security Gatekeeper check passed.`}
              />
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '28px' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '1.2rem', fontWeight: '800', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaApple /> Step 3: Grant Screen Recording & Accessibility Permissions
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '14px', lineHeight: '1.6' }}>
                macOS privacy policies require user approval for screen recording:
              </p>
              <ol style={{ color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: '1.8', paddingLeft: '20px' }}>
                <li>Open <strong>System Settings</strong> → <strong>Privacy & Security</strong> → <strong>Screen Recording</strong>.</li>
                <li>Toggle <strong>DeviceDesk Agent</strong> to <strong>ON</strong>.</li>
                <li>Do the same under <strong>Accessibility</strong>.</li>
              </ol>

              <CodeBlock
                cmd={`open /Applications/DeviceDeskAgent.app`}
                id="mac-step3"
                copiedCmd={copiedCmd}
                copyToClipboard={copyToClipboard}
              />

              <TerminalOutput
                title="Terminal Output (Launch App):"
                output={`Opening /Applications/DeviceDeskAgent.app...
[DeviceDesk Agent v2.4.0 macOS] Active & Monitoring.`}
              />
            </div>
          </div>
        )}

        {/* SECTION 3: WINDOWS SETUP GUIDE */}
        {activeTab === 'windows' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '28px' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '1.2rem', fontWeight: '800', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaWindows /> Step 1: Download & Extract ZIP (PowerShell)
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '14px', lineHeight: '1.6' }}>
                Download <code>DeviceDeskAgent-Portable.zip</code> and extract using PowerShell:
              </p>

              <CodeBlock
                cmd={`Invoke-WebRequest -Uri "https://devicedesk.flymediatech.com/download/DeviceDeskAgent-Portable.zip" -OutFile "$HOME\\Downloads\\DeviceDeskAgent-Portable.zip"\nExpand-Archive -Path "$HOME\\Downloads\\DeviceDeskAgent-Portable.zip" -DestinationPath "$HOME\\DeviceDeskAgent" -Force\ncd "$HOME\\DeviceDeskAgent"`}
                id="win-step1"
                copiedCmd={copiedCmd}
                copyToClipboard={copyToClipboard}
              />

              <TerminalOutput
                title="PowerShell Command Output:"
                output={`StatusCode        : 200
StatusDescription : OK
Content           : {80, 75, 3, 4...}
RawContentLength  : 105126044

Extracting: DeviceDeskAgent-Portable.zip [==========================] 100%
Extracted 4 files to C:\\Users\\Employee\\DeviceDeskAgent`}
              />
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '28px' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '1.2rem', fontWeight: '800', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaWindows /> Step 2: Launch Binary Executable
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '14px', lineHeight: '1.6' }}>
                Double-click <code>DeviceDeskAgent.exe</code> or launch via PowerShell command:
              </p>

              <CodeBlock
                cmd={`.\\DeviceDeskAgent.exe`}
                id="win-step2"
                copiedCmd={copiedCmd}
                copyToClipboard={copyToClipboard}
              />

              <TerminalOutput
                title="PowerShell Execution Output:"
                output={`PS C:\\Users\\Employee\\DeviceDeskAgent> .\\DeviceDeskAgent.exe
[DeviceDesk Agent v2.4.0 - Windows 64-bit]
[Network] Server connected: https://devicedesk.flymediatech.com
[Auth] Employee Credentials verified: aman@yopmail.com (ID: emp14)
[Status] System tray icon minimized. Heartbeat ping active (30s).
✓ Desktop Agent active and recording background work activity.`}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Sub-component: Copyable Code Block (Command Input)
function CodeBlock({ cmd, id, copiedCmd, copyToClipboard }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--accent-cyan)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        <FiTerminal style={{ fontSize: '1rem', color: 'var(--accent-cyan)' }} /> 💻 COMMAND TO RUN (Terminal Input):
      </div>
      <div style={{ position: 'relative' }}>
        <pre style={{
          backgroundColor: '#090d16',
          color: '#ffffff',
          padding: '16px 110px 16px 18px',
          borderRadius: '10px',
          fontSize: '0.9rem',
          fontWeight: '600',
          fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
          overflowX: 'auto',
          border: '1px solid var(--accent-cyan)',
          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.15)',
          margin: 0,
          lineHeight: '1.6'
        }}>
          <code>{cmd}</code>
        </pre>
        <button
          onClick={() => copyToClipboard(cmd, id)}
          title="Copy Command to Clipboard"
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: copiedCmd === id ? 'var(--status-resolved)' : 'var(--accent-blue)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
            transition: 'all 0.2s ease'
          }}
        >
          {copiedCmd === id ? <><FiCheckCircle /> Copied!</> : <><FiCopy /> Copy </>}
        </button>
      </div>
    </div>
  );
}

// Sub-component: Terminal Emulator Output Box (Command Output)
function TerminalOutput({ title, output }) {
  return (
    <div style={{ marginTop: '14px' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--status-resolved)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        <FiCheckCircle style={{ color: 'var(--status-resolved)' }} /> 🖥️ {title || 'EXPECTED TERMINAL OUTPUT:'}
      </div>
      <div style={{
        backgroundColor: '#050811',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '10px',
        padding: '16px 20px',
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        fontSize: '0.84rem',
        fontWeight: '500',
        color: '#00ff66',
        whiteSpace: 'pre-wrap',
        lineHeight: '1.65',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)'
      }}>
        {output}
      </div>
    </div>
  );
}
