const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('proficio_token');
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const url = `${BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (e) {
    throw new Error('Cannot reach server. Check if backend is running.');
  }

  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Server returned invalid response. URL: ${url}`);
  }

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  signup: (body: any) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),

  // Profiles
  getProfiles: (params?: string) => request(`/profiles${params ? `?${params}` : ''}`),
  getProfile: (id: string) => request(`/profiles/${id}`),
  createProfile: (formData: FormData) => request('/profiles', { method: 'POST', body: formData }),
  updateProfile: (id: string, body: any) => request(`/profiles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // Bookings
  checkAvailability: (body: any) => request('/bookings/check-availability', { method: 'POST', body: JSON.stringify(body) }),
  getSlots: (profileId: string, date: string) => request(`/bookings/slots/${profileId}/${date}`),
  createBooking: (body: any) => request('/bookings', { method: 'POST', body: JSON.stringify(body) }),
  myBookings: () => request('/bookings/my'),
  professionalBookings: () => request('/bookings/professional'),
  cancelBooking: (id: string) => request(`/bookings/${id}/cancel`, { method: 'POST' }),
  modifyBooking: (id: string, body: any) => request(`/bookings/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  completeBooking: (id: string) => request(`/bookings/${id}/complete`, { method: 'POST' }),

  // Feedback
  submitFeedback: (body: any) => request('/feedback', { method: 'POST', body: JSON.stringify(body) }),
  getProfileFeedback: (profileId: string) => request(`/feedback/profile/${profileId}`),

  // Support
  createTicket: (body: any) => request('/support', { method: 'POST', body: JSON.stringify(body) }),
  myTickets: () => request('/support/my'),

  // Categories
  getCategories: () => request('/categories'),
};
