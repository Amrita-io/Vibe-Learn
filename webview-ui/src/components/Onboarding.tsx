import React, { useState, useEffect } from 'react';
import { LockIcon, CheckIcon, ShieldIcon, SwordIcon, FlameIcon, TrophyIcon } from './Icons';

interface OnboardingProps {
  onStartScan: () => Promise<void>;
  isScanning: boolean;
  onComplete: () => void;
}

export default function Onboarding({
  onStartScan,
  isScanning,
  onComplete
}: OnboardingProps) {
  const [step, setStep] = useState<number>(1);
  const [pillarsRevealed, setPillarsRevealed] = useState<number>(0);
  const [animationFrame, setAnimationFrame] = useState<number>(1);

  // Step 3 animation loop to reveal pillars sequentially
  useEffect(() => {
    if (step === 3) {
      setPillarsRevealed(0);
      const interval = setInterval(() => {
        setPillarsRevealed(prev => {
          if (prev >= 5) {
            clearInterval(interval);
            return 5;
          }
          return prev + 1;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [step]);

  // Step 4 frame animation loop
  useEffect(() => {
    if (step === 4) {
      const interval = setInterval(() => {
        setAnimationFrame(prev => (prev % 3) + 1);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [step]);

  // Automatically start workspace scan on Step 5
  useEffect(() => {
    if (step === 5) {
      onStartScan().then(() => {
        onComplete();
      }).catch(err => {
        console.error("Scan error on onboarding:", err);
      });
    }
  }, [step]);

  const nextStep = () => setStep(prev => Math.min(5, prev + 1));
  const prevStep = () => setStep(prev => Math.max(1, prev - 1));
  const skipToScan = () => setStep(5);

  const pillars = [
    { name: "Architecture", desc: "Map how files connect and where third-party boundaries lie." },
    { name: "Logic", desc: "Sequence workflows, trace function dependencies, and map parameter inputs." },
    { name: "Syntax", desc: "Comprehend tricky operators, language structures, and library purposes." },
    { name: "Engineering Decisions", desc: "Evaluate alternative solutions, weigh design trade-offs, and debug failures." },
    { name: "Concepts", desc: "Locate patterns, map prerequisite learning tracks, and test code security." }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#0D0D0F',
      color: '#F0EEF8',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      zIndex: 99999,
      fontFamily: 'var(--font-sans)',
      overflowY: 'auto'
    }}>
      
      {/* Top Header branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <ShieldIcon size={18} className="text-accent" />
        <span style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px' }}>VIBE LEARN</span>
      </div>

      {/* Main Slide Workspace */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        
        {/* Step 1: Welcome */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0', lineHeight: 1.2 }}>
              Stop vibing.<br/>Start understanding.
            </h2>
            <p className="text-muted" style={{ fontSize: '12px', lineHeight: 1.4, maxWidth: '280px', margin: '0 auto' }}>
              Vibe Learn turns AI-generated codebases into interactive learning missions, building real engineering expertise.
            </p>
            <button className="btn btn-primary" onClick={nextStep} style={{ padding: '12px', marginTop: '16px' }}>
              Let's go →
            </button>
          </div>
        )}

        {/* Step 2: The Problem */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, textAlign: 'center' }}>
              The AI Knowledge Gap
            </h3>
            
            {/* Split Screen Indicator */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="card" style={{ flex: 1, textAlign: 'center', border: '1px solid rgba(45, 212, 160, 0.3)', backgroundColor: 'rgba(45, 212, 160, 0.02)' }}>
                <span className="text-success" style={{ fontSize: '18px', fontWeight: 'bold', display: 'block' }}>100%</span>
                <span className="text-muted" style={{ fontSize: '9px', textTransform: 'uppercase' }}>Feature Complete</span>
              </div>
              <div className="card" style={{ flex: 1, textAlign: 'center', border: '1px solid rgba(245, 166, 35, 0.3)', backgroundColor: 'rgba(245, 166, 35, 0.02)' }}>
                <span className="text-warning" style={{ fontSize: '18px', fontWeight: 'bold', display: 'block' }}>18%</span>
                <span className="text-muted" style={{ fontSize: '9px', textTransform: 'uppercase' }}>Your Understanding</span>
              </div>
            </div>

            <p className="text-muted" style={{ fontSize: '11.5px', textAlign: 'center', margin: 0, lineHeight: 1.4 }}>
              AI built the software. But do <strong>YOU</strong> know how it works? Vibe Learn helps you bridge the gap.
            </p>
            
            <button className="btn btn-primary" onClick={nextStep} style={{ padding: '12px' }}>
              Show me how →
            </button>
          </div>
        )}

        {/* Step 3: The 5 Pillars */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, textAlign: 'center' }}>
              The Core Decryption Pillars
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pillars.map((p, idx) => {
                const isVisible = pillarsRevealed > idx;
                return (
                  <div 
                    key={p.name} 
                    style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'flex-start',
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible ? 'translateY(0)' : 'translateY(4px)',
                      transition: 'all 0.3s ease',
                      padding: '4px'
                    }}
                  >
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-color)',
                      marginTop: '6px'
                    }} />
                    <div>
                      <strong style={{ fontSize: '11px', color: 'var(--text-primary)' }}>{p.name}</strong>
                      <div className="text-muted" style={{ fontSize: '10px', marginTop: '1px' }}>{p.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button 
              className="btn btn-primary" 
              onClick={nextStep} 
              disabled={pillarsRevealed < 5}
              style={{ padding: '12px', marginTop: '8px' }}
            >
              Got it →
            </button>
          </div>
        )}

        {/* Step 4: How Missions Work */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>
              The Learning Loop
            </h3>

            {/* Animation Frames */}
            <div style={{
              width: '100%',
              height: '100px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              position: 'relative',
              backgroundColor: '#070709',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '12px'
            }}>
              {animationFrame === 1 && (
                <div style={{ textAlign: 'center', animation: 'fade-in 0.5s' }}>
                  <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent-color)' }}>
                    {"const token = jwt.sign(payload, secret);"}
                  </div>
                  <div className="text-muted" style={{ fontSize: '9px', marginTop: '6px' }}>
                    1. AI Generates code snippet...
                  </div>
                </div>
              )}
              {animationFrame === 2 && (
                <div style={{ textAlign: 'center', animation: 'fade-in 0.5s' }}>
                  <div className="card" style={{ padding: '6px 12px', borderColor: 'var(--accent-color)', fontSize: '11px' }}>
                    🎯 Locate the signing payload
                  </div>
                  <div className="text-muted" style={{ fontSize: '9px', marginTop: '6px' }}>
                    2. Gamified Mission generates...
                  </div>
                </div>
              )}
              {animationFrame === 3 && (
                <div style={{ textAlign: 'center', animation: 'fade-in 0.5s' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--success-color)' }}>
                    Understanding: 85% (+10% Decrypted)
                  </div>
                  <div className="text-muted" style={{ fontSize: '9px', marginTop: '6px' }}>
                    3. Your knowledge increases!
                  </div>
                </div>
              )}
            </div>

            <p className="text-muted" style={{ fontSize: '11px', textAlign: 'center', margin: 0 }}>
              Unlock files, match components, and audit bugs. Every codebase becomes a customized RPG map.
            </p>

            <button className="btn btn-primary" onClick={nextStep} style={{ padding: '12px', width: '100%' }}>
              Analyze my workspace →
            </button>
          </div>
        )}

        {/* Step 5: Workspace Scan */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
            {/* Spinning radar scanner */}
            <div style={{ position: 'relative', width: '60px', height: '60px' }}>
              <div className="radar-scanner" style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '2px solid rgba(124, 109, 250, 0.15)',
                borderTopColor: 'var(--accent-color)',
                animation: 'spin 1.2s linear infinite'
              }} />
              <ShieldIcon size={20} className="text-accent" style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }} />
            </div>

            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
                Mapping Decryption Roadmap
              </h3>
              <p className="text-muted" style={{ fontSize: '11px', margin: 0, maxWidth: '220px' }}>
                Analyzing folders, tracking architectures, and establishing prerequisite paths...
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Navigation and Indicators */}
      {step < 5 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '20px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-color)'
        }}>
          {/* Back button */}
          {step > 1 ? (
            <button onClick={prevStep} className="btn" style={{ padding: '6px 10px', fontSize: '10px' }}>
              ← Back
            </button>
          ) : (
            <div style={{ width: '40px' }} />
          )}

          {/* Dots */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[1, 2, 3, 4, 5].map((d) => (
              <div 
                key={d} 
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: d === step ? 'var(--accent-color)' : '#282836',
                  transition: 'background-color 0.2s'
                }}
              />
            ))}
          </div>

          {/* Skip button */}
          {step <= 3 ? (
            <button onClick={skipToScan} className="btn text-muted" style={{ padding: '6px 10px', fontSize: '10px' }}>
              Skip
            </button>
          ) : (
            <div style={{ width: '40px' }} />
          )}
        </div>
      )}

    </div>
  );
}
