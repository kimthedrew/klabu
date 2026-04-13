import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  ArrowLeft,
  Store, 
  CheckCircle, 
  XCircle,
  Search,
  Phone,
  DollarSign,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../lib/config';

interface StallOwner {
  id: string;
  fullName: string;
  businessName?: string;
  phoneNumber: string;
  paymentMode?: string;
  mpesaNumber?: string;
  tillNumber?: string;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
  stall?: {
    id: string;
    name: string;
    description?: string;
    menuItems: any[];
  };
}

export default function AdminStalls() {
  const [stalls, setStalls] = useState<StallOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [settlementSummary, setSettlementSummary] = useState<Record<string, { youOwe: number; theyOwe: number; net: number }>>({});
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [ownerEntries, setOwnerEntries] = useState<any[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesStatus, setEntriesStatus] = useState<'OPEN' | 'CLEARED'>('OPEN');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'ADMIN') {
      router.push('/login');
      return;
    }

    fetchStalls();
    fetchStallsSettlements();
  }, []);

  const fetchStalls = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/admin/stalls`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setStalls(response.data.stalls);
    } catch (error) {
      console.error('Error fetching stalls:', error);
      toast.error('Failed to load stalls');
    } finally {
      setLoading(false);
    }
  };

  const fetchStallsSettlements = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/admin/settlements/stalls-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const map: Record<string, { youOwe: number; theyOwe: number; net: number }> = {};
      for (const s of response.data.stalls) {
        map[s.stallOwnerId] = { youOwe: s.youOwe, theyOwe: s.theyOwe, net: s.net };
      }
      setSettlementSummary(map);
    } catch (error) {
      console.error('Error fetching stalls settlements:', error);
    }
  };

  const openOwnerEntries = async (stallOwnerId: string) => {
    try {
      setSelectedOwnerId(stallOwnerId);
      setEntriesLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/admin/settlements/STALL_OWNER/${stallOwnerId}/entries?status=${entriesStatus}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let entries = response.data.entries as any[];
      if (dateFrom) {
        const from = new Date(dateFrom).getTime();
        entries = entries.filter((e: any) => new Date(e.createdAt).getTime() >= from);
      }
      if (dateTo) {
        const to = new Date(dateTo).getTime();
        entries = entries.filter((e: any) => new Date(e.createdAt).getTime() <= to);
      }
      setOwnerEntries(entries);
    } catch (error) {
      toast.error('Failed to load ledger entries');
    } finally {
      setEntriesLoading(false);
    }
  };

  const clearSelected = async (entryIds: string[]) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/admin/settlements/entries/clear`, { entryIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Cleared successfully');
      await openOwnerEntries(selectedOwnerId!);
      await fetchStallsSettlements();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to clear entries');
    }
  };

  const handleApprove = async (stallOwnerId: string, approved: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/admin/stall-owners/${stallOwnerId}/approve`, 
        { approved },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Stall owner ${approved ? 'approved' : 'rejected'} successfully`);
      fetchStalls();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update approval status');
    }
  };

  const handleToggleActive = async (stallOwnerId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/admin/stall-owners/${stallOwnerId}/toggle`, 
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Stall status updated successfully');
      fetchStalls();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update stall status');
    }
  };

  const filteredStalls = stalls.filter(stall =>
    !searchTerm ||
    stall.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stall.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stall.stall?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Manage Stalls - Admin - Klabu</title>
        <meta name="description" content="Manage and approve stall owners" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <Link href="/dashboard/admin" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
                  <ArrowLeft size={20} className="mr-2" />
                  Back to Dashboard
                </Link>
                <h1 className="text-2xl font-bold text-green-600">Manage Stalls</h1>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search stalls by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Stall Owners</h3>
              <p className="text-3xl font-bold text-gray-900">{stalls.length}</p>
            </div>
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Approved</h3>
              <p className="text-3xl font-bold text-green-600">
                {stalls.filter(s => s.isApproved).length}
              </p>
            </div>
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Pending Approval</h3>
              <p className="text-3xl font-bold text-yellow-600">
                {stalls.filter(s => !s.isApproved).length}
              </p>
            </div>
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Currently Active</h3>
              <p className="text-3xl font-bold text-blue-600">
                {stalls.filter(s => s.isActive && s.isApproved).length}
              </p>
            </div>
          </div>

          {/* Stalls List */}
          <div className="space-y-4">
            {filteredStalls.map((stallOwner) => (
              <div key={stallOwner.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {stallOwner.stall?.name || 'No stall created yet'}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        stallOwner.isApproved 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {stallOwner.isApproved ? 'Approved' : 'Pending'}
                      </span>
                      {stallOwner.isApproved && (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          stallOwner.isActive 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {stallOwner.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><strong>Owner:</strong> {stallOwner.fullName}</p>
                      {stallOwner.businessName && (
                        <p><strong>Business:</strong> {stallOwner.businessName}</p>
                      )}
                      <div className="flex items-center">
                        <Phone size={14} className="mr-1" />
                        {stallOwner.phoneNumber}
                      </div>
                      {stallOwner.paymentMode && (
                        <div className="flex items-center">
                          <DollarSign size={14} className="mr-1" />
                          {stallOwner.paymentMode} 
                          {stallOwner.tillNumber 
                            ? ` - Till: ${stallOwner.tillNumber}` 
                            : ` - ${stallOwner.mpesaNumber}`
                          }
                        </div>
                      )}
                      {stallOwner.stall?.menuItems && (
                        <p><strong>Menu Items:</strong> {stallOwner.stall.menuItems.length}</p>
                      )}
                  {/* Settlement summary for this stall owner */}
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-red-50 text-red-700 px-2 py-1 rounded">You owe: KES {settlementSummary[stallOwner.id]?.youOwe?.toFixed(2) || '0.00'}</div>
                    <div className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded">They owe: KES {settlementSummary[stallOwner.id]?.theyOwe?.toFixed(2) || '0.00'}</div>
                    <div className={`px-2 py-1 rounded ${((settlementSummary[stallOwner.id]?.net||0) >= 0) ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>Net: KES {settlementSummary[stallOwner.id]?.net?.toFixed(2) || '0.00'}</div>
                  </div>
                      <p className="text-xs text-gray-500">
                        Registered: {new Date(stallOwner.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    {!stallOwner.isApproved ? (
                      <>
                        <button
                          onClick={() => handleApprove(stallOwner.id, true)}
                          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle size={16} className="mr-2" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleApprove(stallOwner.id, false)}
                          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <XCircle size={16} className="mr-2" />
                          Reject
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center text-green-600">
                          <CheckCircle size={16} className="mr-2" />
                          <span className="text-sm font-medium">Approved</span>
                        </div>
                        <button
                          onClick={() => handleToggleActive(stallOwner.id)}
                          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                            stallOwner.isActive
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {stallOwner.isActive ? (
                            <>
                              <ToggleLeft size={16} className="mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <ToggleRight size={16} className="mr-2" />
                              Activate
                            </>
                          )}
                        </button>
                      <button
                        onClick={() => openOwnerEntries(stallOwner.id)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        View & Clear Settlements
                      </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        {/* Ledger modal */}
        {selectedOwnerId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Ledger Entries ({entriesStatus})</h3>
                <button onClick={() => { setSelectedOwnerId(null); setOwnerEntries([]); }} className="text-gray-500 hover:text-gray-700">Close</button>
              </div>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 items-end">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Status</label>
                  <select value={entriesStatus} onChange={(e) => setEntriesStatus(e.target.value as any)} className="w-full border rounded px-2 py-2">
                    <option value="OPEN">OPEN</option>
                    <option value="CLEARED">CLEARED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">From</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full border rounded px-2 py-2" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">To</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full border rounded px-2 py-2" />
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => openOwnerEntries(selectedOwnerId)} className="px-3 py-2 bg-blue-600 text-white rounded">Apply</button>
                  <button onClick={() => { setDateFrom(''); setDateTo(''); openOwnerEntries(selectedOwnerId); }} className="px-3 py-2 bg-gray-100 rounded">Reset</button>
                </div>
              </div>
              {entriesLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : ownerEntries.length === 0 ? (
                <div className="text-sm text-gray-600">No open entries.</div>
              ) : (
                <div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th className="py-2 pr-4">Select</th>
                          <th className="py-2 pr-4">Source</th>
                          <th className="py-2 pr-4">Direction</th>
                          <th className="py-2 pr-4">Amount</th>
                          <th className="py-2 pr-4">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ownerEntries.map((e: any) => (
                          <tr key={e.id} className="border-t">
                            <td className="py-2 pr-4"><input type="checkbox" value={e.id} onChange={(ev) => {
                              if ((ev.target as HTMLInputElement).checked) {
                                setOwnerEntries(prev => prev.map(x => x.id === e.id ? { ...x, _selected: true } : x));
                              } else {
                                setOwnerEntries(prev => prev.map(x => x.id === e.id ? { ...x, _selected: false } : x));
                              }
                            }} /></td>
                            <td className="py-2 pr-4">{e.sourceType} #{e.sourceId}</td>
                            <td className="py-2 pr-4">{e.direction}</td>
                            <td className="py-2 pr-4">KES {e.amount.toFixed(2)}</td>
                            <td className="py-2 pr-4">{new Date(e.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      onClick={() => {
                        const headers = ['id','entityType','entityId','sourceType','sourceId','direction','amount','status','createdAt'];
                        const rows = ownerEntries.map((e: any) => [e.id,e.entityType,e.entityId,e.sourceType,e.sourceId,e.direction,e.amount,e.status,e.createdAt]);
                        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `ledger-${selectedOwnerId}-${entriesStatus}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                    >
                      Export CSV
                    </button>
                    <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => clearSelected(ownerEntries.filter((e: any) => e._selected).map((e: any) => e.id))}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Clear Selected
                    </button>
                    <button
                      onClick={() => clearSelected(ownerEntries.map((e: any) => e.id))}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Clear All
                    </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
}


