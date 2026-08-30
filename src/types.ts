export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'ngo' | 'donor' | 'delivery';
  status: 'pending' | 'approved' | 'suspended';
  schoolId?: number | null;
}

export interface School {
  id: number;
  user_id?: number;
  name: string;
  blurb: string;
  photo_url: string;
  status?: 'pending' | 'approved' | 'suspended';
  email?: string;
  needs_count?: number;
  total_needed?: number;
  total_pledged?: number;
  delivery_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Need {
  id: number;
  school_id: number;
  title: string;
  category: string;
  grade_info: string;
  qty_needed: number;
  qty_pledged: number;
  created_at?: string;
}

export interface Pledge {
  id: number;
  need_id: number;
  donor_id?: number | null;
  donor_name: string;
  qty: number;
  contact: string;
  status: 'pledged' | 'ready_for_pickup' | 'collected' | 'delivered';
  created_at?: string;
  need_title?: string;
  school_name?: string;
  school_id?: number;
}

export interface Delivery {
  delivery_id: number;
  delivery_status: 'claimed' | 'collected' | 'delivered';
  claimed_at: string;
  collected_at?: string | null;
  delivered_at?: string | null;
  pledge_id: number;
  donor_name: string;
  donor_contact: string;
  qty: number;
  need_title: string;
  school_name: string;
  school_photo?: string;
  pickup_address?: string | null;
  donor_latitude?: number | null;
  donor_longitude?: number | null;
  delivery_address?: string | null;
  school_latitude?: number | null;
  school_longitude?: number | null;
  volunteer_latitude?: number | null;
  volunteer_longitude?: number | null;
  location_updated_at?: string | null;
}

export interface Update {
  id: number;
  school_id: number;
  text: string;
  created_at: string;
}

export interface AdminStats {
  totalSchools: number;
  pendingApprovals: number;
  totalItemsPledged: number;
  totalDeliveriesCompleted: number;
}

export interface NgoStats {
  totalNeeded: number;
  totalPledged: number;
  pledgesReceived: number;
  fulfillmentRate: number;
}
