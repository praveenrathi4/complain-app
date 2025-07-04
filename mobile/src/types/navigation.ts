export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  PhoneVerification: { phone: string; name: string };
  EmailVerification: { email: string };
  Main: undefined;
  ComplaintDetail: { complaintId: string };
};

export type TabParamList = {
  Dashboard: undefined;
  NewComplaint: undefined;
  Profile: undefined;
};

export type Complaint = {
  _id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  complaintId: string;
  createdAt: string;
  updatedAt: string;
  images?: string[];
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
};

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'dealer' | 'admin';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  businessName?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
}; 