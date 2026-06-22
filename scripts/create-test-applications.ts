import { supabase } from '../lib/supabase';

/**
 * Create test applications for testing Pipeline Board
 * 
 * Usage: npx tsx scripts/create-test-applications.ts
 */

async function createTestApplications() {
  console.log('🚀 Creating test applications...\n');

  // Get first user
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .limit(1);

  if (!users || users.length === 0) {
    console.error('❌ No users found. Please sign in first.');
    process.exit(1);
  }

  const userId = users[0].id;
  console.log(`✅ Using user ID: ${userId}\n`);

  const testApps = [
    // To-do stage
    {
      user_id: userId,
      company_name: 'Google',
      position: 'Senior Project Manager',
      url: 'https://careers.google.com/jobs/123',
      current_stage: 'To-do',
      resume_status: 'Not Started',
      hr_interview_status: 'Not Started',
      technical_interview_status: 'Not Started',
      final_interview_status: 'Not Started',
      last_contact_date: new Date().toISOString().split('T')[0],
    },
    {
      user_id: userId,
      company_name: 'Microsoft',
      position: 'Program Manager',
      url: 'https://careers.microsoft.com/us/en/job/456',
      current_stage: 'To-do',
      resume_status: 'Not Started',
      hr_interview_status: 'Not Started',
      technical_interview_status: 'Not Started',
      final_interview_status: 'Not Started',
      last_contact_date: new Date().toISOString().split('T')[0],
    },
    // Resume stage
    {
      user_id: userId,
      company_name: 'Amazon',
      position: 'Technical Program Manager',
      url: 'https://amazon.jobs/en/jobs/789',
      current_stage: 'Resume',
      current_stage_status: 'Scheduled / Sent',
      resume_status: 'Scheduled / Sent',
      hr_interview_status: 'Not Started',
      technical_interview_status: 'Not Started',
      final_interview_status: 'Not Started',
      last_contact_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      hr_name: 'Sarah Johnson',
      communication_channel: 'Email',
      contact_details: 'sarah.j@amazon.com',
    },
    {
      user_id: userId,
      company_name: 'Meta',
      position: 'Product Manager',
      url: 'https://www.metacareers.com/jobs/012',
      current_stage: 'Resume',
      current_stage_status: 'Waiting',
      resume_status: 'Waiting',
      hr_interview_status: 'Not Started',
      technical_interview_status: 'Not Started',
      final_interview_status: 'Not Started',
      last_contact_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      salary: '$180k-$220k',
      conditions: 'Remote\nHealth insurance\n20 vacation days',
    },
    // HR Interview stage
    {
      user_id: userId,
      company_name: 'Apple',
      position: 'Project Manager',
      url: 'https://jobs.apple.com/en-us/details/345',
      current_stage: 'HR Interview',
      current_stage_status: 'Scheduled / Sent',
      resume_status: 'Passed',
      hr_interview_status: 'Scheduled / Sent',
      technical_interview_status: 'Not Started',
      final_interview_status: 'Not Started',
      last_contact_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      hr_name: 'John Smith',
      communication_channel: 'LinkedIn',
      contact_details: 'linkedin.com/in/johnsmith',
      notes: 'HR interview scheduled for next Monday at 2 PM',
    },
    // Technical Interview stage
    {
      user_id: userId,
      company_name: 'Netflix',
      position: 'Delivery Manager',
      url: 'https://jobs.netflix.com/jobs/678',
      current_stage: 'Technical Interview',
      current_stage_status: 'Waiting',
      resume_status: 'Passed',
      hr_interview_status: 'Passed',
      technical_interview_status: 'Waiting',
      final_interview_status: 'Not Started',
      last_contact_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      salary: '€90k-€110k',
      notes: 'Technical round went well. Waiting for feedback.',
    },
    // Final Interview stage
    {
      user_id: userId,
      company_name: 'Spotify',
      position: 'Senior Delivery Manager',
      url: 'https://www.spotifyjobs.com/jobs/901',
      current_stage: 'Final Interview',
      current_stage_status: 'Scheduled / Sent',
      resume_status: 'Passed',
      hr_interview_status: 'Passed',
      technical_interview_status: 'Passed',
      final_interview_status: 'Scheduled / Sent',
      last_contact_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      hr_name: 'Emma Wilson',
      communication_channel: 'Telegram',
      contact_details: '@emmaw',
      salary: '€100k-€120k',
      conditions: 'Hybrid (2 days office)\nStock options\n25 vacation days\nWellness budget',
      notes: 'Final round with VP of Engineering scheduled',
    },
    // Rejected
    {
      user_id: userId,
      company_name: 'Uber',
      position: 'Program Manager',
      url: 'https://www.uber.com/careers/list/234',
      current_stage: 'Rejected',
      resume_status: 'Passed',
      hr_interview_status: 'Rejected',
      technical_interview_status: 'Not Started',
      final_interview_status: 'Not Started',
      rejected_stage: 'HR Interview',
      rejection_reason: 'Decided to move with another candidate',
      rejection_comment: 'They mentioned they went with someone with more experience in their specific domain',
      last_contact_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    // Offer
    {
      user_id: userId,
      company_name: 'Shopify',
      position: 'Technical Project Manager',
      url: 'https://www.shopify.com/careers/567',
      current_stage: 'Offer',
      resume_status: 'Passed',
      hr_interview_status: 'Passed',
      technical_interview_status: 'Passed',
      final_interview_status: 'Passed',
      offer_status: 'Pending',
      last_contact_date: new Date().toISOString().split('T')[0],
      salary: '€95k + equity',
      conditions: 'Fully remote\nHealth insurance\nUnlimited PTO\nLaptop + home office budget',
      notes: 'Received offer! Deciding between this and another option.',
    },
  ];

  console.log(`📝 Creating ${testApps.length} test applications...\n`);

  for (const app of testApps) {
    const { data, error } = await supabase
      .from('applications')
      .insert(app)
      .select()
      .single();

    if (error) {
      console.error(`❌ Error creating ${app.company_name}:`, error.message);
    } else {
      console.log(`✅ Created: ${app.company_name} - ${app.position} (${app.current_stage})`);
      
      // Create activity log entry
      await supabase
        .from('activity_log')
        .insert({
          application_id: data.id,
          event: 'Application created',
          details: `Test application for ${app.company_name}`,
        });
    }
  }

  console.log('\n✨ Test applications created successfully!');
  console.log('🌐 Visit http://localhost:3000/dashboard to see them\n');
}

createTestApplications();
