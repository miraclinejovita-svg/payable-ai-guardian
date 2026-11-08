import React, { useState, useEffect } from 'react';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { Header } from './components/Header';
import { LiveAnnouncer } from './components/LiveAnnouncer';
import { AccessibilityDrawer } from './components/AccessibilityDrawer';
import { LaunchScreen } from './pages/LaunchScreen';
import { Dashboard } from './pages/Dashboard';
import { OrderSelectPage } from './pages/OrderSelectPage';
import { IntentReviewFlow } from './pages/IntentReviewFlow';
import { PaymentProcessPage } from './pages/PaymentProcessPage';
import { ResultPage } from './pages/ResultPage';
import { ActivityPage } from './pages/ActivityPage';
import { HelpPage } from './pages/HelpPage';
import { PrivacySecurityPage } from './pages/PrivacySecurityPage';
import {
  TrustedOrder,
  InterpretedIntention,
  IntentMatchResult,
  DemoActivityRecord,
  ServiceHealth,
} from './types';
import { TRUSTED_DEMO_ORDERS } from './services/demoOrders';
import { ApiClient } from './services/apiClient';

type AppTab =
  | 'launch'
  | 'dashboard'
  | 'select-order'
  | 'review'
  | 'checkout'
  | 'result'
  | 'activity'
  | 'help'
  | 'privacy';

export const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<AppTab>('launch');
  const [selectedOrder, setSelectedOrder] = useState<TrustedOrder | null>(null);
  const [activeIntention, setActiveIntention] = useState<InterpretedIntention | null>(null);
  const [activeMatchResult, setActiveMatchResult] = useState<IntentMatchResult | null>(null);
  const [paymentOutcome, setPaymentOutcome] = useState<'COMPLETED' | 'CANCELLED' | 'FAILED' | 'UNKNOWN'>('COMPLETED');
  const [captureRecord, setCaptureRecord] = useState<any>(null);
  const [paymentError, setPaymentError] = useState<string>('');

  const [recentActivity, setRecentActivity] = useState<DemoActivityRecord[]>(() => {
    try {
      const stored = localStorage.getItem('payable_demo_activity_v1');
      if (stored) return JSON.parse(stored);
    } catch {
      // Safe fallback
    }
    return [];
  });

  const [serviceHealth, setServiceHealth] = useState<ServiceHealth>({
    server: 'checking',
    aiProvider: 'checking',
    paypalSandbox: 'checking',
    message: 'Checking backend status...',
  });

  // Probe backend health status on startup
  useEffect(() => {
    ApiClient.checkHealth().then((health) => {
      setServiceHealth(health);
    });
  }, []);

  // Persist demo activity to localStorage safely
  useEffect(() => {
    try {
      localStorage.setItem('payable_demo_activity_v1', JSON.stringify(recentActivity));
    } catch {
      // Safe ignore
    }
  }, [recentActivity]);

  const addActivityRecord = (record: Omit<DemoActivityRecord, 'id' | 'timestamp'>) => {
    const newRecord: DemoActivityRecord = {
      ...record,
      id: `ACT-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setRecentActivity((prev) => [newRecord, ...prev]);
  };

  const handleClearActivity = () => {
    setRecentActivity([]);
    try {
      localStorage.removeItem('payable_demo_activity_v1');
    } catch {
      // Safe ignore
    }
  };

  // Safe Session Reset (Stage 14)
  const handleResetSession = () => {
    setSelectedOrder(null);
    setActiveIntention(null);
    setActiveMatchResult(null);
    setCaptureRecord(null);
    setPaymentError('');
    setCurrentTab('dashboard');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <LiveAnnouncer />
      <Header
        currentTab={currentTab}
        onNavigate={(tab) => setCurrentTab(tab as AppTab)}
        serviceHealth={serviceHealth}
      />
      <AccessibilityDrawer />

      <main style={{ flex: 1, paddingBottom: '2rem' }}>
        {currentTab === 'launch' && (
          <LaunchScreen
            onGetStarted={() => setCurrentTab('dashboard')}
            onTryDemo={() => {
              setSelectedOrder(TRUSTED_DEMO_ORDERS[0]);
              setCurrentTab('review');
            }}
            onNavigate={(tab) => setCurrentTab(tab as AppTab)}
          />
        )}

        {currentTab === 'dashboard' && (
          <Dashboard
            onStartCheck={() => setCurrentTab('select-order')}
            onNavigate={(tab) => setCurrentTab(tab as AppTab)}
            recentActivity={recentActivity}
          />
        )}

        {currentTab === 'select-order' && (
          <OrderSelectPage
            selectedOrder={selectedOrder}
            onSelectOrder={(order) => setSelectedOrder(order)}
            onProceed={() => {
              if (selectedOrder) {
                setCurrentTab('review');
              }
            }}
          />
        )}

        {currentTab === 'review' && selectedOrder && (
          <IntentReviewFlow
            order={selectedOrder}
            onProceedToCheckout={(_order, intention, matchResult) => {
              setActiveIntention(intention);
              setActiveMatchResult(matchResult);
              setCurrentTab('checkout');
            }}
            onBackToOrders={() => setCurrentTab('select-order')}
            onCancel={handleResetSession}
          />
        )}

        {currentTab === 'checkout' && selectedOrder && activeIntention && activeMatchResult && (
          <PaymentProcessPage
            order={selectedOrder}
            intention={activeIntention}
            matchResult={activeMatchResult}
            onPaymentSuccess={(record) => {
              setCaptureRecord(record);
              setPaymentOutcome('COMPLETED');
              addActivityRecord({
                orderReference: selectedOrder.orderReference,
                merchantName: selectedOrder.merchantName,
                amountDisplay: selectedOrder.amountDisplay,
                currency: selectedOrder.currency,
                matchOutcome: activeMatchResult.outcome,
                transactionStatus: 'COMPLETED',
                paypalCaptureId: record.captureId,
                isSimulated: true,
                details: `Verified capture of ${selectedOrder.currency} ${selectedOrder.amountDisplay} for order ${selectedOrder.orderReference}.`,
              });
              setCurrentTab('result');
            }}
            onPaymentCancel={() => {
              setPaymentOutcome('CANCELLED');
              addActivityRecord({
                orderReference: selectedOrder.orderReference,
                merchantName: selectedOrder.merchantName,
                amountDisplay: selectedOrder.amountDisplay,
                currency: selectedOrder.currency,
                matchOutcome: activeMatchResult.outcome,
                transactionStatus: 'CANCELLED',
                isSimulated: true,
                details: `User safely cancelled checkout for order ${selectedOrder.orderReference}.`,
              });
              setCurrentTab('result');
            }}
            onPaymentFail={(errMsg) => {
              setPaymentOutcome('FAILED');
              setPaymentError(errMsg);
              addActivityRecord({
                orderReference: selectedOrder.orderReference,
                merchantName: selectedOrder.merchantName,
                amountDisplay: selectedOrder.amountDisplay,
                currency: selectedOrder.currency,
                matchOutcome: activeMatchResult.outcome,
                transactionStatus: 'FAILED',
                isSimulated: true,
                details: `Payment authorization failed: ${errMsg}`,
              });
              setCurrentTab('result');
            }}
          />
        )}

        {currentTab === 'result' && (
          <ResultPage
            outcome={paymentOutcome}
            captureRecord={captureRecord}
            errorMessage={paymentError}
            onReturnHome={handleResetSession}
            onViewActivity={() => setCurrentTab('activity')}
            onRetry={() => {
              setSelectedOrder(null);
              setActiveIntention(null);
              setActiveMatchResult(null);
              setCurrentTab('select-order');
            }}
          />
        )}

        {currentTab === 'activity' && (
          <ActivityPage
            activityRecords={recentActivity}
            onClearActivity={handleClearActivity}
            onBack={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'help' && (
          <HelpPage onBack={() => setCurrentTab('dashboard')} />
        )}

        {currentTab === 'privacy' && (
          <PrivacySecurityPage onBack={() => setCurrentTab('dashboard')} />
        )}
      </main>

      {/* Accessible Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-secondary)',
          padding: '1.25rem 1rem',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}
      >
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <strong>PayAble AI Guardian</strong> — Accessible Voice-First Payment Assistant
          </div>
          <div>
            <span>WCAG 2.2 AA Minded • PayPal Sandbox Test Environment Only</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AccessibilityProvider>
      <AppContent />
    </AccessibilityProvider>
  );
};

export default App;
