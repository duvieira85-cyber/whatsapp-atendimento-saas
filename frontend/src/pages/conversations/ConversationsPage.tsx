import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Drawer,
  useMediaQuery,
} from '@mui/material';
import { listConversations } from '../../services/conversations';
import { listDepartments } from '../../services/departments';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeEvent } from '../../contexts/WebSocketContext';
import QueuePanel from '../../components/chat/QueuePanel';
import ConversationList from '../../components/chat/ConversationList';
import ChatArea from '../../components/chat/ChatArea';
import CustomerPanel from '../../components/chat/CustomerPanel';
import type { Conversation, Department } from '../../types';

const ENABLE_CUSTOMER_PANEL = false;

const CP_WIDTH = 280;
const QP_WIDTH = 220;
const CL_WIDTH = 340;

export default function ConversationsPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [queuePanelOpen, setQueuePanelOpen] = useState(false);
  const convRef = useRef<HTMLDivElement>(null);

  // Raw breakpoint queries — no gaps, no custom hook
  const isWide = useMediaQuery('(min-width:1600px)');
  const isDesktop = useMediaQuery('(min-width:1366px)');
  const isMedium = useMediaQuery('(min-width:1024px)');

  const [customerPanelOpen, setCustomerPanelOpen] = useState(ENABLE_CUSTOMER_PANEL);
  const customerToggle = ENABLE_CUSTOMER_PANEL
    ? { onToggleCustomerPanel: () => setCustomerPanelOpen(!customerPanelOpen), customerPanelOpen }
    : {};

  const filteredConversations = selectedQueue
    ? conversations.filter((c) =>
        selectedQueue === '__none__' ? c.department === null : c.department === selectedQueue
      )
    : conversations;

  const selectedConv = conversations.find((c) => c.id === selectedId) || null;

  const fetchData = useCallback(async () => {
    try {
      const [convData, deptData] = await Promise.all([
        listConversations(),
        listDepartments(),
      ]);
      setConversations(convData.results || []);
      setDepartments(deptData.results || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRealtimeEvent = useCallback(
    (data: Record<string, unknown>) => {
      const eventType = data.event_type as string;
      if (
        eventType === 'conversation.created' ||
        eventType === 'conversation.assigned' ||
        eventType === 'conversation.transferred' ||
        eventType === 'conversation.closed' ||
        eventType === 'conversation.reopened' ||
        eventType === 'message.received' ||
        eventType === 'message.sent' ||
        eventType === 'queue.entered' ||
        eventType === 'queue.left'
      ) {
        fetchData();
      }
    },
    [fetchData],
  );

  useRealtimeEvent('*', handleRealtimeEvent);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (!isMedium && ENABLE_CUSTOMER_PANEL) setCustomerPanelOpen(false);
  };

  useEffect(() => {
    if (ENABLE_CUSTOMER_PANEL) {
      if (isWide) setCustomerPanelOpen(true);
      else setCustomerPanelOpen(false);
    }
  }, [isWide]);

  const currentUserName =
    user ? `${user.first_name} ${user.last_name}`.trim() || user.email : '';

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  // ============================================================
  // NARROW (<1024px): mobile/tablet flow — drawers only
  // ============================================================
  if (!isMedium) {
    return (
      <Box sx={{ flex: 1, minHeight: 0, bgcolor: '#FFFFFF', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Drawer
          anchor="left"
          open={queuePanelOpen}
          onClose={() => setQueuePanelOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: 280 } }}
        >
          <QueuePanel
            conversations={conversations}
            departments={departments}
            selectedQueue={selectedQueue}
            onSelectQueue={(id) => { setSelectedQueue(id); setQueuePanelOpen(false); }}
            onClose={() => setQueuePanelOpen(false)}
          />
        </Drawer>

        {!selectedId ? (
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            <ConversationList
              conversations={filteredConversations}
              selectedId={selectedId}
              onSelect={handleSelect}
              departments={departments}
              selectedQueue={selectedQueue}
              onSelectQueue={setSelectedQueue}
              onOpenQueuePanel={() => setQueuePanelOpen(true)}
            />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', height: '100%' }}>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {selectedConv && (
                <ChatArea
                  conversation={selectedConv}
                  currentUserId={user?.id ? String(user.id) : null}
                  currentUserName={currentUserName}
                  onUpdate={fetchData}
                  onBack={() => { setSelectedId(null); }}
                  {...customerToggle}
                />
              )}
            </Box>
            {ENABLE_CUSTOMER_PANEL && (
              <Drawer
                anchor="right"
                open={customerPanelOpen}
                onClose={() => setCustomerPanelOpen(false)}
                sx={{ '& .MuiDrawer-paper': { width: '85vw', maxWidth: 400 } }}
              >
                {selectedConv && (
                  <CustomerPanel conversation={selectedConv} onClose={() => setCustomerPanelOpen(false)} />
                )}
              </Drawer>
            )}
          </Box>
        )}
      </Box>
    );
  }

  // ============================================================
  // MEDIUM (1024-1365px): sidebar 72px, customer panel as Drawer
  // ============================================================
  if (isMedium && !isDesktop) {
    return (
      <Box
        ref={convRef}
        sx={{ display: 'flex', flex: 1, minHeight: 0, bgcolor: '#FFFFFF', overflow: 'hidden' }}
      >
        {/* Queue panel — inline collapsible */}
        <Box sx={{
          width: queuePanelOpen ? QP_WIDTH : 0,
          flexShrink: 0,
          overflow: 'hidden',
          borderRight: queuePanelOpen ? '1px solid' : 'none',
          borderColor: 'divider',
          transition: 'width 0.2s ease',
        }}>
          {queuePanelOpen && (
            <QueuePanel
              conversations={conversations}
              departments={departments}
              selectedQueue={selectedQueue}
              onSelectQueue={setSelectedQueue}
              onClose={() => setQueuePanelOpen(false)}
            />
          )}
        </Box>

        {/* Conversation List */}
        <Box sx={{ width: CL_WIDTH, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider' }}>
          <ConversationList
            conversations={filteredConversations}
            selectedId={selectedId}
            onSelect={handleSelect}
            onOpenQueuePanel={() => setQueuePanelOpen(!queuePanelOpen)}
            departments={departments}
            selectedQueue={selectedQueue}
            onSelectQueue={setSelectedQueue}
          />
        </Box>

        {/* Chat — always flex:1 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {selectedConv ? (
            <ChatArea
              conversation={selectedConv}
              currentUserId={user?.id ? String(user.id) : null}
              currentUserName={currentUserName}
              onUpdate={fetchData}
              {...customerToggle}
            />
          ) : (
            <EmptyState />
          )}
        </Box>

        {ENABLE_CUSTOMER_PANEL && (
          <Drawer
            anchor="right"
            open={customerPanelOpen}
            onClose={() => setCustomerPanelOpen(false)}
            sx={{ '& .MuiDrawer-paper': { width: CP_WIDTH } }}
          >
            {selectedConv && (
              <CustomerPanel conversation={selectedConv} onClose={() => setCustomerPanelOpen(false)} />
            )}
          </Drawer>
        )}
      </Box>
    );
  }

  // ============================================================
  // DESKTOP (>=1366px): full layout, customer panel inline
  //  >=1600: customer open by default
  //  1366-1599: customer closed by default, toggleable
  // ============================================================
  return (
    <Box
      ref={convRef}
      sx={{ display: 'flex', flex: 1, minHeight: 0, bgcolor: '#FFFFFF', overflow: 'hidden' }}
    >
      {/* Queue panel — inline collapsible */}
      <Box sx={{
        width: queuePanelOpen ? QP_WIDTH : 0,
        flexShrink: 0,
        overflow: 'hidden',
        borderRight: queuePanelOpen ? '1px solid' : 'none',
        borderColor: 'divider',
        transition: 'width 0.2s ease',
      }}>
        {queuePanelOpen && (
          <QueuePanel
            conversations={conversations}
            departments={departments}
            selectedQueue={selectedQueue}
            onSelectQueue={setSelectedQueue}
            onClose={() => setQueuePanelOpen(false)}
          />
        )}
      </Box>

      {/* Conversation List */}
      <Box sx={{ width: CL_WIDTH, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider' }}>
        <ConversationList
          conversations={filteredConversations}
          selectedId={selectedId}
          onSelect={handleSelect}
          onOpenQueuePanel={() => setQueuePanelOpen(!queuePanelOpen)}
          departments={departments}
          selectedQueue={selectedQueue}
          onSelectQueue={setSelectedQueue}
        />
      </Box>

      {/* Chat — always flex:1, highest priority */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {selectedConv ? (
          <ChatArea
            conversation={selectedConv}
            currentUserId={user?.id ? String(user.id) : null}
            currentUserName={currentUserName}
            onUpdate={fetchData}
            {...customerToggle}
          />
        ) : (
          <EmptyState />
        )}
      </Box>

      {ENABLE_CUSTOMER_PANEL && selectedConv && (
        <Box sx={{
          width: customerPanelOpen ? CP_WIDTH : 0,
          flexShrink: 0,
          overflow: 'hidden',
          borderLeft: customerPanelOpen ? '1px solid' : 'none',
          borderColor: 'divider',
          transition: 'width 0.2s ease',
        }}>
          {customerPanelOpen && (
            <CustomerPanel
              conversation={selectedConv}
              onClose={() => setCustomerPanelOpen(false)}
            />
          )}
        </Box>
      )}
    </Box>
  );
}

function EmptyState() {
  return (
    <Box
      sx={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        bgcolor: '#FAFAFA', gap: 1,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 500, color: '#9CA3AF' }}>
        Selecione uma conversa
      </Typography>
      <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
        Escolha uma conversa na lista ao lado para iniciar o atendimento
      </Typography>
    </Box>
  );
}
