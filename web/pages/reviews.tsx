import { useState, useEffect } from 'react';
import Link from 'next/link';
import SEO from '../components/SEO';
import { 
  Star, 
  Search, 
  MessageSquare, 
  Store, 
  Truck, 
  User, 
  Filter,
  Plus,
  ArrowLeft,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../lib/config';

interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  createdAt: string;
  stall?: {
    id: string;
    name: string;
  };
  deliveryPerson?: {
    id: string;
    fullName: string;
  };
}

interface Stall {
  id: string;
  name: string;
  averageRating: number;
  totalReviews: number;
}

interface DeliveryPerson {
  id: string;
  fullName: string;
  averageRating: number;
  totalReviews: number;
}

export default function ReviewsPage() {
  const [activeTab, setActiveTab] = useState<'stalls' | 'delivery-persons' | 'all-reviews'>('stalls');
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedStall, setSelectedStall] = useState<Stall | null>(null);
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState<DeliveryPerson | null>(null);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
    reviewerName: '',
    type: 'stall' as 'stall' | 'delivery-person',
    targetId: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stallsRes, deliveryPersonsRes, reviewsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/reviews/stalls`),
        axios.get(`${API_BASE_URL}/reviews/delivery-persons`),
        axios.get(`${API_BASE_URL}/reviews`)
      ]);

      setStalls(stallsRes.data.stalls);
      setDeliveryPersons(deliveryPersonsRes.data.deliveryPersons);
      setReviews(reviewsRes.data.reviews);
    } catch (error) {
      console.error('Error fetching reviews data:', error);
      toast.error('Failed to load reviews data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newReview.comment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/reviews`, {
        ...newReview,
        targetId: newReview.type === 'stall' ? selectedStall?.id : selectedDeliveryPerson?.id
      });

      toast.success('Review submitted successfully!');
      setShowReviewForm(false);
      setNewReview({
        rating: 5,
        comment: '',
        reviewerName: '',
        type: 'stall',
        targetId: ''
      });
      setSelectedStall(null);
      setSelectedDeliveryPerson(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit review');
    }
  };

  const openReviewForm = (type: 'stall' | 'delivery-person', item: Stall | DeliveryPerson) => {
    setNewReview({
      ...newReview,
      type,
      targetId: item.id
    });
    
    if (type === 'stall') {
      setSelectedStall(item as Stall);
    } else {
      setSelectedDeliveryPerson(item as DeliveryPerson);
    }
    
    setShowReviewForm(true);
  };

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onRatingChange?.(star)}
            className={`${interactive ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <Star
              size={20}
              className={`${
                star <= rating
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const filteredStalls = stalls.filter(stall =>
    stall.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDeliveryPersons = deliveryPersons.filter(person =>
    person.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReviews = reviews.filter(review =>
    review.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
    review.reviewerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (review.stall?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (review.deliveryPerson?.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
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
      <SEO
        title="Reviews"
        description="Read and write reviews for Klabu food stalls and delivery persons at the University of Nairobi. See ratings from UON students."
        canonical="/reviews"
      />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-4 gap-3">
              <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900 flex-shrink-0">
                <ArrowLeft size={20} className="mr-1" />
                <span className="hidden sm:inline">Back</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-green-600">Reviews & Ratings</h1>
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
                placeholder="Search stalls, delivery persons, or reviews..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div className="border-b border-gray-200 overflow-x-auto">
              <nav className="-mb-px flex min-w-max space-x-4 sm:space-x-8">
                <button
                  onClick={() => setActiveTab('stalls')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'stalls'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Store size={16} className="inline mr-1" />
                  Stalls ({stalls.length})
                </button>
                <button
                  onClick={() => setActiveTab('delivery-persons')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'delivery-persons'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Truck size={16} className="inline mr-1" />
                  Delivery ({deliveryPersons.length})
                </button>
                <button
                  onClick={() => setActiveTab('all-reviews')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'all-reviews'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <MessageSquare size={16} className="inline mr-1" />
                  Reviews ({reviews.length})
                </button>
              </nav>
            </div>
          </div>

          {/* Content */}
          {activeTab === 'stalls' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStalls.map((stall) => (
                <div key={stall.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{stall.name}</h3>
                      <div className="flex items-center mt-2">
                        {renderStars(stall.averageRating)}
                        <span className="ml-2 text-sm text-gray-600">
                          {stall.averageRating.toFixed(1)} ({stall.totalReviews} reviews)
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => openReviewForm('stall', stall)}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <Plus size={16} className="mr-2" />
                    Write Review
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'delivery-persons' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDeliveryPersons.map((person) => (
                <div key={person.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{person.fullName}</h3>
                      <div className="flex items-center mt-2">
                        {renderStars(person.averageRating)}
                        <span className="ml-2 text-sm text-gray-600">
                          {person.averageRating.toFixed(1)} ({person.totalReviews} reviews)
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => openReviewForm('delivery-person', person)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <Plus size={16} className="mr-2" />
                    Write Review
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'all-reviews' && (
            <div className="space-y-6">
              {filteredReviews.map((review) => (
                <div key={review.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        {renderStars(review.rating)}
                        <span className="ml-2 text-sm text-gray-600">
                          by {review.reviewerName || 'Anonymous'}
                        </span>
                      </div>
                      <p className="text-gray-900 mb-2">{review.comment}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        {review.stall && (
                          <span className="flex items-center mr-4">
                            <Store size={14} className="mr-1" />
                            {review.stall.name}
                          </span>
                        )}
                        {review.deliveryPerson && (
                          <span className="flex items-center mr-4">
                            <Truck size={14} className="mr-1" />
                            {review.deliveryPerson.fullName}
                          </span>
                        )}
                        <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Review Form Modal */}
          {showReviewForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Write a Review for {newReview.type === 'stall' ? selectedStall?.name : selectedDeliveryPerson?.fullName}
                </h3>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={newReview.reviewerName}
                      onChange={(e) => setNewReview({...newReview, reviewerName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Anonymous"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rating
                    </label>
                    {renderStars(newReview.rating, true, (rating) => setNewReview({...newReview, rating}))}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Review *
                    </label>
                    <textarea
                      required
                      value={newReview.comment}
                      onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows={4}
                      placeholder="Share your experience..."
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Submit Review
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}






















