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
                  ? 'text-accent fill-current'
                  : 'text-muted/40'
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
      <div className="min-h-screen bg-background flex items-center justify-center font-body">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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

      <div className="min-h-screen bg-background font-body">
        {/* Header */}
        <header className="bg-surface border-b border-muted/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-4 gap-3">
              <Link href="/" className="flex items-center text-muted hover:text-app-text flex-shrink-0">
                <ArrowLeft size={20} className="mr-1" />
                <span className="hidden sm:inline">Back</span>
              </Link>
              <h1 className="font-heading text-xl sm:text-2xl text-primary">Reviews &amp; Ratings</h1>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" size={20} />
              <input
                type="text"
                placeholder="Search stalls, delivery persons, or reviews..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface border border-muted/40 rounded-button text-app-text placeholder-muted focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div className="border-b border-muted/30 overflow-x-auto">
              <nav className="-mb-px flex min-w-max space-x-4 sm:space-x-8">
                <button
                  onClick={() => setActiveTab('stalls')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'stalls'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-app-text hover:border-muted/40'
                  }`}
                >
                  <Store size={16} className="inline mr-1" />
                  Stalls ({stalls.length})
                </button>
                <button
                  onClick={() => setActiveTab('delivery-persons')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'delivery-persons'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-app-text hover:border-muted/40'
                  }`}
                >
                  <Truck size={16} className="inline mr-1" />
                  Delivery ({deliveryPersons.length})
                </button>
                <button
                  onClick={() => setActiveTab('all-reviews')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'all-reviews'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-app-text hover:border-muted/40'
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
                <div key={stall.id} className="bg-surface rounded-card shadow-soft border border-muted/20 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-heading text-lg text-app-text">{stall.name}</h3>
                      <div className="flex items-center mt-2">
                        {renderStars(stall.averageRating)}
                        <span className="ml-2 text-sm text-muted">
                          {stall.averageRating.toFixed(1)} ({stall.totalReviews} reviews)
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => openReviewForm('stall', stall)}
                    className="w-full bg-primary text-surface py-2 px-4 rounded-button hover:bg-primary/90 transition-colors flex items-center justify-center font-medium"
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
                <div key={person.id} className="bg-surface rounded-card shadow-soft border border-muted/20 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-heading text-lg text-app-text">{person.fullName}</h3>
                      <div className="flex items-center mt-2">
                        {renderStars(person.averageRating)}
                        <span className="ml-2 text-sm text-muted">
                          {person.averageRating.toFixed(1)} ({person.totalReviews} reviews)
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => openReviewForm('delivery-person', person)}
                    className="w-full bg-primary text-surface py-2 px-4 rounded-button hover:bg-primary/90 transition-colors flex items-center justify-center font-medium"
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
                <div key={review.id} className="bg-surface rounded-card shadow-soft border border-muted/20 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        {renderStars(review.rating)}
                        <span className="ml-2 text-sm text-muted">
                          by {review.reviewerName || 'Anonymous'}
                        </span>
                      </div>
                      <p className="text-app-text mb-2">{review.comment}</p>
                      <div className="flex items-center text-sm text-muted">
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
            <div className="fixed inset-0 bg-app-text/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-surface rounded-card shadow-soft p-6 w-full max-w-md">
                <h3 className="font-heading text-lg text-app-text mb-4">
                  Write a Review for {newReview.type === 'stall' ? selectedStall?.name : selectedDeliveryPerson?.fullName}
                </h3>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-app-text mb-2">
                      Your Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={newReview.reviewerName}
                      onChange={(e) => setNewReview({...newReview, reviewerName: e.target.value})}
                      className="w-full px-3 py-2 bg-background border border-muted/40 rounded-button text-app-text placeholder-muted focus:outline-none focus:border-primary transition-colors"
                      placeholder="Anonymous"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-app-text mb-2">
                      Rating
                    </label>
                    {renderStars(newReview.rating, true, (rating) => setNewReview({...newReview, rating}))}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-app-text mb-2">
                      Your Review *
                    </label>
                    <textarea
                      required
                      value={newReview.comment}
                      onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                      className="w-full px-3 py-2 bg-background border border-muted/40 rounded-card text-app-text placeholder-muted focus:outline-none focus:border-primary transition-colors"
                      rows={4}
                      placeholder="Share your experience..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="flex-1 px-4 py-2 border border-muted/40 rounded-button text-app-text hover:bg-background transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-primary text-surface py-2 rounded-button hover:bg-primary/90 transition-colors font-medium"
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






















