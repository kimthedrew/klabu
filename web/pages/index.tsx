import { useState, useEffect } from 'react';
import Link from 'next/link';
import SEO from '../components/SEO';
import { Search, MapPin, Clock, Star, Phone, ShoppingCart } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../lib/config';
import toast from 'react-hot-toast';

interface Stall {
  id: string;
  fullName: string;
  businessName?: string;
  phoneNumber: string;
  photo?: string;
  stallPhoto?: string;
  stall?: {
    id: string;
    name: string;
    description?: string;
    averageRating: number;
    totalReviews: number;
    menuItems: MenuItem[];
  };
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  isAvailable: boolean;
}

export default function Home() {
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [foodSearch, setFoodSearch] = useState('');

  useEffect(() => {
    fetchStalls();
  }, []);

  const fetchStalls = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stalls`);
      setStalls(response.data.stalls);
    } catch (error) {
      toast.error('Failed to load stalls');
      console.error('Error fetching stalls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (foodSearch) params.append('food', foodSearch);
      
      const response = await axios.get(`${API_BASE_URL}/stalls?${params.toString()}`);
      setStalls(response.data.stalls);
    } catch (error) {
      toast.error('Search failed');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStalls = stalls.filter(stall => {
    if (!searchTerm && !foodSearch) return true;
    
    const matchesStallName = !searchTerm || 
      stall.stall?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stall.businessName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFood = !foodSearch || 
      stall.stall?.menuItems.some(item => 
        item.name.toLowerCase().includes(foodSearch.toLowerCase())
      );
    
    return matchesStallName && matchesFood;
  });

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Klabu',
      url: 'https://klabu.site',
      description: 'UON food delivery platform — order from campus stalls and get food delivered to your hostel.',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://klabu.site/?search={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Klabu',
      url: 'https://klabu.site',
      description: 'Food delivery service for University of Nairobi students. Order from Klabu stalls and get meals delivered to your hostel.',
      areaServed: {
        '@type': 'Place',
        name: 'University of Nairobi, Nairobi, Kenya',
      },
    },
  ];

  return (
    <>
      <SEO
        canonical="/"
        description="Order food from Klabu stalls at the University of Nairobi and get it delivered to your hostel. Fast, easy UON food delivery."
        jsonLd={jsonLd}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-green-600">Klabu</h1>
                <span className="ml-2 text-sm text-gray-500">UON Food Delivery</span>
              </div>
              <div className="flex space-x-4">
                <Link href="/reviews" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                  <Star size={16} className="mr-2" />
                  Reviews
                </Link>
                <Link href="/app" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                  For Stall Owners and Delivery Persons
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="bg-gradient-to-r from-green-600 to-green-700 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold mb-4">
              Food from Klabu, Delivered to Your Hostel
            </h2>
            <p className="text-xl mb-8 text-green-100">
              Skip the walk to Klabu. Order from your favorite stalls and get it delivered right to your room.
              in case of any issues, please contact the admin on +254113690898.
            </p>
          </div>
        </section>

        {/* Search Section */}
        <section className="py-8 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search for stalls..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search for food..."
                  value={foodSearch}
                  onChange={(e) => setFoodSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={handleSearch}
              className="mt-4 w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Search Stalls & Food
            </button>
          </div>
        </section>

        {/* Stalls Grid */}
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading stalls...</p>
              </div>
            ) : filteredStalls.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No stalls found. Try adjusting your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStalls.map((stall) => (
                  <StallCard key={stall.id} stall={stall} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function StallCard({ stall }: { stall: Stall }) {
  if (!stall.stall) return null;

  return (
    <Link href={`/stall/${stall.stall.id}`} className="block">
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden">
        {stall.stallPhoto && (
          <div className="h-48 bg-gray-200">
            <img
              src={stall.stallPhoto}
              alt={stall.stall.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="p-6">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-xl font-semibold text-gray-900">{stall.stall.name}</h3>
            {stall.stall.averageRating > 0 && (
              <div className="flex items-center text-yellow-500">
                <Star size={16} className="fill-current" />
                <span className="ml-1 text-sm font-medium">{stall.stall.averageRating}</span>
              </div>
            )}
          </div>
          
          <p className="text-gray-600 text-sm mb-2">{stall.fullName}</p>
          
          {stall.stall.description && (
            <p className="text-gray-500 text-sm mb-4 line-clamp-2">{stall.stall.description}</p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center text-gray-500 text-sm">
              <Phone size={16} className="mr-1" />
              <span>{stall.phoneNumber}</span>
            </div>
            
            <div className="flex items-center text-gray-500 text-sm">
              <span>{stall.stall.menuItems.length} items</span>
            </div>
          </div>
          
          {stall.stall.menuItems.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Popular items:</p>
              <div className="flex flex-wrap gap-2">
                {stall.stall.menuItems.slice(0, 3).map((item) => (
                  <span
                    key={item.id}
                    className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                  >
                    {item.name} - KES {item.price}
                  </span>
                ))}
                {stall.stall.menuItems.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{stall.stall.menuItems.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
