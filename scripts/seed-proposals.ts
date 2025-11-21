import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

const mockProposals = testCreators.map((creator, index) => ({
  dao_address: '0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17',
  proposal_id: `test-${index + 1}`,
  creator_address: `0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`,
  creator_username: creator,
  title: `Should the DAO purchase ${creator} creator coin?`,
  description: descriptions[index],
  cover_image_url: `https://images.pexels.com/photos/${[1194420, 1763075, 159581, 2102587, 3184291, 3184338, 3184339, 3184360, 3184418, 3184465, 3184611, 3184613, 3184614, 3184634][index]}/pexels-photo.jpeg?auto=compress&cs=tinysrgb&w=800`,
  status: 'active'
}));

async function seedProposals() {
  console.log('Seeding proposals...');

  for (const proposal of mockProposals) {
    const { data, error } = await supabase
      .from('proposals')
      .upsert(proposal, { onConflict: 'dao_address,proposal_id' })
      .select();

    if (error) {
      console.error(`Error seeding proposal ${proposal.proposal_id}:`, error);
    } else {
      console.log(`Seeded proposal: ${proposal.creator_username}`);
    }
  }

  console.log('Seeding complete!');
}

seedProposals().catch(console.error);
