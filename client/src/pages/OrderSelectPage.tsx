import React, { useState, useEffect } from 'react';
import { ShoppingBag, Check, Info, ArrowRight, Server, RefreshCw } from 'lucide-react';
import { TRUSTED_DEMO_ORDERS } from '../services/demoOrders';
import { TrustedOrder } from '../types';
import { DemoBadge } from '../components/DemoBadge';
import { useAccessibility } from '../context/AccessibilityContext';
import { ApiClient } from '../services/apiClient';

interface OrderSelectPageProps {
  selectedOrder: TrustedOrder | null;
  onSelectOrder: (order: TrustedOrder) => void;
  onProceed: () => void;
}

export const OrderSelectPage: React.FC<OrderSelectPageProps> = ({
  selectedOrder,
  onSelectOrder,
  onProceed,
}) => {
  const { announce, speak } = useAccessibility();
  const [orders, setOrders] = useState<TrustedOrder[]>(TRUSTED_DEMO_ORDERS);
  const [orderSource, setOrderSource] = useState<'backend' | 'offline_fallback'>('offline_fallback');
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);

  useEffect(() => {
    setIsLoadingOrders(true);
    ApiClient.getDemoOrders()
      .then(({ orders: fetchedOrders, source }) => {
        setOrders(fetchedOrders);
        setOrderSource(source);
      })
      .finally(() => {
        setIsLoadingOrders(false);
      });

    const msg =
      'Select a trusted demo order to verify. Three sample orders are available: Maya Stores for 500 rupees, Tech Essentials for 1200 rupees, and Global Software for 15 dollars.';
    announce(msg);
  }, [announce]);

  const handleOrderClick = (order: TrustedOrder) => {
    onSelectOrder(order);
    const text = `Selected order ${order.orderReference} for ${order.merchantName}, amount ${order.currency} ${order.amountDisplay}.`;
    announce(text);
    speak(text);
  };

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <main id="main-content" tabIndex={-1}>
        <div className="card" style={{ borderColor: 'var(--border-strong)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
                Stage 1: Select Trusted Order
              </h1>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Choose an authoritative order record. The IntentMatch engine will verify your spoken or typed intention against this exact order.
              </p>
            </div>
            <DemoBadge />
          </div>

          {/* Sandbox Currency Transparency Notice */}
          <div className="callout callout-info" role="note" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <Info size={22} style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
            <div style={{ fontSize: '0.875rem' }}>
              <strong>PayPal Sandbox Currency Transparency:</strong>
              <p style={{ margin: '0.25rem 0 0 0' }}>
                Orders A and B are in <strong>INR (₹)</strong>, ideal for testing Indian Rupee voice intentions and mismatch detection. Order C is configured in <strong>USD ($)</strong> for live PayPal REST API Sandbox testing, as standard global sandbox accounts require approved currencies. We never silently convert currencies.
              </p>
            </div>
          </div>

          {/* Source indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>
              {isLoadingOrders ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <RefreshCw size={14} className="spinning" aria-hidden="true" />
                  <span>Loading authoritative orders from backend...</span>
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Server size={14} color={orderSource === 'backend' ? '#34d399' : '#f59e0b'} aria-hidden="true" />
                  <span>{orderSource === 'backend' ? 'Source: Express Backend API (/api/demo/orders)' : 'Source: Offline Demo Records'}</span>
                </span>
              )}
            </span>
          </div>

          {/* Order Selection Cards List */}
          <div
            role="radiogroup"
            aria-label="Available trusted demo orders"
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '1rem 0 1.5rem 0' }}
          >
            {orders.map((order) => {
              const isSelected = selectedOrder?.id === order.id;

              return (
                <div
                  key={order.id}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => handleOrderClick(order)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      handleOrderClick(order);
                    }
                  }}
                  style={{
                    padding: '1.25rem',
                    backgroundColor: isSelected ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                    border: `2px solid ${isSelected ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    transition: 'border-color var(--transition-fast), background-color var(--transition-fast)',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: isSelected ? '#0284c7' : 'var(--bg-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ShoppingBag size={20} color={isSelected ? '#ffffff' : '#94a3b8'} aria-hidden="true" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                          {order.merchantName}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Ref: <strong>{order.orderReference}</strong> • {order.description}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {order.currency} {order.amountDisplay}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: order.supportsLivePayPalSandbox ? '#34d399' : '#f59e0b' }}>
                        {order.supportsLivePayPalSandbox ? '✓ Live PayPal Sandbox Ready' : '• Intent Mismatch Testing'}
                      </div>
                    </div>
                  </div>

                  {/* Order Item List preview */}
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: 600 }}>Includes: </span>
                    {order.items.map((it) => `${it.quantity}x ${it.name} (${it.priceDisplay})`).join(', ')}
                  </div>

                  {isSelected && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8', fontSize: '0.8rem', fontWeight: 700 }}>
                      <Check size={16} aria-hidden="true" />
                      <span>SELECTED</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {selectedOrder ? (
                <span>
                  Ready to check order: <strong>{selectedOrder.orderReference}</strong> ({selectedOrder.currency} {selectedOrder.amountDisplay})
                </span>
              ) : (
                <span>Please select an order above to continue</span>
              )}
            </div>

            <button
              className="btn btn-primary btn-lg"
              disabled={!selectedOrder}
              onClick={onProceed}
              aria-label="Proceed to express payment intention"
            >
              <span>Continue to Voice / Typed Check</span>
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
