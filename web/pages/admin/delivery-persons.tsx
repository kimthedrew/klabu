import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  ArrowLeft,
  Truck, 
  CheckCircle, 
  XCircle,
  Search,
  Phone,
  Star,
  CreditCard,
  Clock,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../lib/config';

interface DeliveryPerson {
  id: string;
  fullName: string;
  phoneNumber: string;
  idNumber: string;
  isApproved: boolean;
  isActive: boolean;
  rating: number;
  totalDeliveries: number;
  createdAt: string;
}

export default function AdminDeliveryPersons() {
  const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tripsSummary, setTripsSummary] = useState<Record<string, number>>({});
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

    fetchDeliveryPersons();
    fetchTripsSummary();
  }, []);

  const fetchDeliveryPersons = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/admin/delivery-persons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDeliveryPersons(response.data.deliveryPersons);
    } catch (error) {
      console.error('Error fetching delivery persons:', error);
      toast.error('Failed to load delivery persons');
    } finally {
      setLoading(false);
    }
  };

  const fetchTripsSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/admin/settlements/delivery-persons-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const map: Record<string, number> = {};
      for (const p of response.data.deliveryPersons) {
        map[p.deliveryPersonId] = p.trips;
      }
      setTripsSummary(map);
    } catch (error) {
      console.error('Error fetching delivery trips summary:', error);
    }
  };

  const handleApprove = async (deliveryPersonId: string, approved: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/admin/delivery-persons/${deliveryPersonId}/approve`, 
        { approved },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Delivery person ${approved ? 'approved' : 'rejected'} successfully`);
      fetchDeliveryPersons();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update approval status');
    }
  };

  const handleToggleActive = async (deliveryPersonId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/admin/delivery-persons/${deliveryPersonId}/toggle`, 
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Delivery person status updated successfully');
      fetchDeliveryPersons();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update delivery person status');
    }
  };

  const filteredDeliveryPersons = deliveryPersons.filter(person =>
    !searchTerm ||
    person.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.idNumber.toLowerCase().includes(searchTerm.toLowerCase())
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
        <title>Manage Delivery Persons - Admin - Klabu</title>
        <meta name="description" content="Manage and approve delivery persons" />
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
                <h1 className="text-2xl font-bold text-green-600">Manage Delivery Persons</h1>
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
                placeholder="Search by name or ID number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Export */}
          <div className="mb-6">
            <button
              onClick={() => {
                const headers = ['deliveryPersonId','fullName','phoneNumber','trips'];
                const rows = (Object.keys(tripsSummary)).map(id => {
                  const person = deliveryPersons.find(p => p.id === id);
                  return [id, person?.fullName || '', person?.phoneNumber || '', (tripsSummary[id] ?? 0)];
                });
                const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'delivery-trips-summary.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Export Trips CSV
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Delivery Persons</h3>
              <p className="text-3xl font-bold text-gray-900">{deliveryPersons.length}</p>
            </div>
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Approved</h3>
              <p className="text-3xl font-bold text-green-600">
                {deliveryPersons.filter(d => d.isApproved).length}
              </p>
            </div>
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Pending Approval</h3>
              <p className="text-3xl font-bold text-yellow-600">
                {deliveryPersons.filter(d => !d.isApproved).length}
              </p>
            </div>
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Currently Active</h3>
              <p className="text-3xl font-bold text-blue-600">
                {deliveryPersons.filter(d => d.isActive && d.isApproved).length}
              </p>
            </div>
          </div>

          {/* Delivery Persons List */}
          <div className="space-y-4">
            {filteredDeliveryPersons.map((person) => (
              <div key={person.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{person.fullName}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        person.isApproved 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {person.isApproved ? 'Approved' : 'Pending'}
                      </span>
                      {person.isApproved && (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          person.isActive 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {person.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Phone size={14} className="mr-1" />
                        {person.phoneNumber}
                      </div>
                      <div className="flex items-center">
                        <CreditCard size={14} className="mr-1" />
                        ID: {person.idNumber}
                      </div>
                      <div className="flex items-center">
                        <Star size={14} className="mr-1 text-yellow-500" />
                        Rating: {person.rating.toFixed(1)} ({person.totalDeliveries} deliveries)
                      </div>
                      <div className="text-sm text-indigo-700 mt-1">
                        Trips (DELIVERED): {tripsSummary[person.id] ?? 0}
                      </div>
                      <p className="text-xs text-gray-500">
                        Registered: {new Date(person.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    {!person.isApproved ? (
                      <>
                        <button
                          onClick={() => handleApprove(person.id, true)}
                          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle size={16} className="mr-2" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleApprove(person.id, false)}
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
                          onClick={() => handleToggleActive(person.id)}
                          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                            person.isActive
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {person.isActive ? (
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
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
