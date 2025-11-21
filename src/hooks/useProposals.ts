import { useState, useEffect } from 'react';
import { supabase, Proposal } from '../lib/supabase';
import { APP_CONFIG } from '../config/app';

const testCreators = [
  '@bloodpiano',
  '@empresstrash',
  '@jessepollak',
  '@skatehacker',
  '@k4lana',
  '@r4to',
  '@gianinaskarlett',
  '@willywonka',
  '@pixiekate',
  '@realitycrafter',
  '@lauracielie',
  '@pau_unik',
  '@alex_masmej',
  '@gnericvibes'
];

const descriptions = [
  'A talented creator building innovative content and growing their community on Base.',
  'Established creator with strong engagement and authentic community connection.',
  'Emerging talent creating unique content that resonates with the creator economy.',
  'Creative innovator pushing boundaries in digital content and community building.',
  'Prolific creator with a track record of high-quality output and community growth.',
  'Rising star in the creator space with excellent community engagement.',
  'Authentic voice creating compelling content and building a loyal following.',
  'Visionary creator experimenting with new formats and engaging their audience.',
  'Community-focused creator building lasting connections through their work.',
  'Innovative content creator with a unique perspective and growing influence.',
  'Talented artist creating memorable experiences for their community.',
  'Creative professional with consistent output and strong community trust.',
  'Pioneering creator exploring new frontiers in digital content.',
  'Dynamic creator building bridges between communities through their work.'
];

const mockProposals: Proposal[] = testCreators.map((creator, index) => ({
  id: `mock-${index + 1}`,
  dao_address: APP_CONFIG.DAO_ADDRESS.toLowerCase(),
  proposal_id: `test-${index + 1}`,
  creator_address: `0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`,
  creator_username: creator,
  title: `Should the DAO purchase ${creator} creator coin?`,
  description: descriptions[index],
  cover_image_url: `https://images.pexels.com/photos/${[1194420, 1763075, 159581, 2102587, 3184291, 3184338, 3184339, 3184360, 3184418, 3184465, 3184611, 3184613, 3184614, 3184634][index]}/pexels-photo.jpeg?auto=compress&cs=tinysrgb&w=800`,
  status: 'active',
  created_at: new Date(Date.now() - index * 86400000).toISOString(),
  updated_at: new Date(Date.now() - index * 86400000).toISOString()
}));

export function useProposals(testMode: boolean = false) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProposals() {
      try {
        if (testMode) {
          setProposals(mockProposals);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('proposals')
          .select('*')
          .eq('dao_address', APP_CONFIG.DAO_ADDRESS.toLowerCase())
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProposals(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch proposals');
      } finally {
        setLoading(false);
      }
    }

    fetchProposals();
  }, [testMode]);

  return { proposals, loading, error };
}
