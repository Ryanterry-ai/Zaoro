/**
 * Customer Journey Engine: Generates customer journey stages for any business.
 * Domain agnostic, capability driven.
 */

export type JourneyStageType = 'awareness' | 'consideration' | 'conversion' | 'retention' | 'advocacy';

export interface JourneyStage {
  id: string;
  type: JourneyStageType;
  name: string;
  description: string;
  touchpoints: string[];
  userActions: string[];
  businessActions: string[];
  painPoints: string[];
  opportunities: string[];
  metrics: string[];
  automationPotential: 'low' | 'medium' | 'high';
}

export interface CustomerJourneyGraph {
  stages: JourneyStage[];
  totalTouchpoints: number;
  totalPainPoints: number;
  automationScore: number;
  recommendedImprovements: string[];
}

// ─── Journey Templates by Capability ─────────────────────────────

interface JourneyTemplate {
  capability: string;
  stages: Array<{
    type: JourneyStageType;
    name: string;
    touchpoints: string[];
    userActions: string[];
    businessActions: string[];
    painPoints: string[];
    opportunities: string[];
  }>;
}

const JOURNEY_TEMPLATES: JourneyTemplate[] = [
  {
    capability: 'ecommerce',
    stages: [
      { type: 'awareness', name: 'Discovery', touchpoints: ['social_media', 'search', 'ads', 'referral'], userActions: ['search_product', 'see_ad', 'read_review'], businessActions: ['run_ads', 'seo_optimize', 'content_marketing'], painPoints: ['low_visibility', 'high_competition'], opportunities: ['influencer_partnerships', 'content_marketing'] },
      { type: 'consideration', name: 'Evaluation', touchpoints: ['website', 'reviews', 'comparison'], userActions: ['browse_products', 'compare_prices', 'read_reviews'], businessActions: ['show_reviews', 'provide_comparison', 'retarget'], painPoints: ['price_sensitivity', 'trust_concerns'], opportunities: ['social_proof', 'money_back_guarantee'] },
      { type: 'conversion', name: 'Purchase', touchpoints: ['website', 'cart', 'checkout'], userActions: ['add_to_cart', 'checkout', 'pay'], businessActions: ['simplify_checkout', 'offer_discounts', 'upsell'], painPoints: ['cart_abandonment', 'payment_issues'], opportunities: ['one_click_checkout', 'guest_checkout'] },
      { type: 'retention', name: 'Post-Purchase', touchpoints: ['email', 'app', 'support'], userActions: ['receive_order', 'use_product', 'contact_support'], businessActions: ['follow_up', 'request_review', 'cross_sell'], painPoints: ['delivery_issues', 'product_quality'], opportunities: ['loyalty_program', 'personalized_recommendations'] },
      { type: 'advocacy', name: 'Loyalty', touchpoints: ['social', 'referral', 'community'], userActions: ['review_product', 'refer_friend', 'share_experience'], businessActions: ['referral_program', 'user_generated_content', 'vip_perks'], painPoints: ['lack_of_incentive', 'forget_to_refer'], opportunities: ['referral_rewards', 'brand_ambassador'] },
    ],
  },
  {
    capability: 'booking',
    stages: [
      { type: 'awareness', name: 'Discovery', touchpoints: ['google', 'social', 'word_of_mouth'], userActions: ['search_service', 'find_provider', 'compare_options'], businessActions: ['local_seo', 'google_business', 'collect_reviews'], painPoints: ['hard_to_find', 'unclear_pricing'], opportunities: ['google_business_profile', 'online_booking_link'] },
      { type: 'consideration', name: 'Selection', touchpoints: ['website', 'app', 'phone'], userActions: ['view_availability', 'check_prices', 'read_reviews'], businessActions: ['show_real_time_availability', 'display_pricing', 'show_staff_profiles'], painPoints: ['no_real_time_availability', 'confusing_pricing'], opportunities: ['real_time_calendar', 'transparent_pricing'] },
      { type: 'conversion', name: 'Booking', touchpoints: ['website', 'app', 'phone'], userActions: ['select_time', 'confirm_booking', 'pay'], businessActions: ['confirm_automatically', 'send_reminders', 'process_payment'], painPoints: ['complex_booking_flow', 'payment_failures'], opportunities: ['one_click_rebook', 'sms_confirmations'] },
      { type: 'retention', name: 'Experience', touchpoints: ['in_person', 'app', 'email'], userActions: ['attend_appointment', 'provide_feedback', 'rebook'], businessActions: ['deliver_excellent_service', 'request_feedback', 'offer_rebook_discount'], painPoints: ['no_follow_up', 'forgotten_appointments'], opportunities: ['automated_reminders', 'loyalty_points'] },
      { type: 'advocacy', name: 'Referral', touchpoints: ['social', 'reviews', 'referral'], userActions: ['leave_review', 'refer_friend', 'share_experience'], businessActions: ['referral_program', 'review_incentives', 'social_sharing'], painPoints: ['no_referral_program', 'hard_to_refer'], opportunities: ['referral_discounts', 'review_rewards'] },
    ],
  },
  {
    capability: 'saas',
    stages: [
      { type: 'awareness', name: 'Discovery', touchpoints: ['content', 'ads', 'referral', 'product_hunt'], userActions: ['read_blog', 'see_demo', 'compare_tools'], businessActions: ['content_marketing', 'product_demos', 'freemium_tier'], painPoints: ['tool_overload', 'unclear_value'], opportunities: ['free_trial', 'interactive_demo'] },
      { type: 'consideration', name: 'Evaluation', touchpoints: ['website', 'demo', 'trial'], userActions: ['start_trial', 'explore_features', 'test_integrations'], businessActions: ['onboard_automatically', 'show_value_quickly', 'offer_support'], painPoints: ['complex_onboarding', 'feature_overload'], opportunities: ['guided_tutorial', 'use_case_templates'] },
      { type: 'conversion', name: 'Activation', touchpoints: ['app', 'email', 'support'], userActions: ['complete_setup', 'invite_team', 'upgrade'], businessActions: ['convert_trial', 'offer_discount', 'show_roi'], painPoints: ['pricing_confusion', 'commitment_fear'], opportunities: ['usage_based_pricing', 'annual_discount'] },
      { type: 'retention', name: 'Engagement', touchpoints: ['app', 'email', 'success'], userActions: ['use_features', 'request_support', 'give_feedback'], businessActions: ['engage_regularly', 'offer_training', 'prevent_churn'], painPoints: ['feature_unused', 'support_slow'], opportunities: ['product_tours', 'success_manager'] },
      { type: 'advocacy', name: 'Expansion', touchpoints: ['referral', 'community', 'reviews'], userActions: ['refer_team', 'leave_review', 'share_case_study'], businessActions: ['referral_program', 'case_study_program', 'community_building'], painPoints: ['no_referral_incentive', 'hard_to_measure_roi'], opportunities: ['referral_credits', 'success_stories'] },
    ],
  },
  {
    capability: 'services',
    stages: [
      { type: 'awareness', name: 'Discovery', touchpoints: ['google', 'linkedin', 'referral', 'networking'], userActions: ['search_provider', 'ask_referral', 'check_portfolio'], businessActions: ['showcase_work', 'network', 'content_marketing'], painPoints: ['hard_to_differentiate', 'trust_barriers'], opportunities: ['case_studies', 'thought_leadership'] },
      { type: 'consideration', name: 'Evaluation', touchpoints: ['website', 'consultation', 'proposal'], userActions: ['review_portfolio', 'request_proposal', 'compare_agencies'], businessActions: ['create_proposal', 'show_past_work', 'offer_consultation'], painPoints: ['unclear_pricing', 'slow_response'], opportunities: ['transparent_pricing', 'fast_proposals'] },
      { type: 'conversion', name: 'Engagement', touchpoints: ['contract', 'kickoff', 'project'], userActions: ['sign_contract', 'provide_brief', 'review_progress'], businessActions: ['set_expectations', 'communicate_regularly', 'deliver_milestones'], painPoints: ['scope_creep', 'miscommunication'], opportunities: ['project_dashboard', 'regular_checkins'] },
      { type: 'retention', name: 'Delivery', touchpoints: ['deliverables', 'support', 'reviews'], userActions: ['receive_deliverables', 'provide_feedback', 'request_changes'], businessActions: ['deliver_quality', 'handle_feedback', 'offer_retainer'], painPoints: ['quality_issues', 'delayed_delivery'], opportunities: ['retainer_agreement', 'priority_support'] },
      { type: 'advocacy', name: 'Growth', touchpoints: ['referral', 'case_study', 'testimonial'], userActions: ['refer_client', 'provide_testimonial', 'share_case_study'], businessActions: ['ask_referral', 'create_case_study', 'upsell_services'], painPoints: ['forgotten_referral', 'no_upsell'], opportunities: ['referral_commission', 'expanded_services'] },
    ],
  },
  {
    capability: 'education',
    stages: [
      { type: 'awareness', name: 'Discovery', touchpoints: ['search', 'social', 'ads', 'referral'], userActions: ['search_course', 'compare_platforms', 'read_reviews'], businessActions: ['seo_optimize', 'free_content', 'ads'], painPoints: ['course_overload', 'quality_uncertainty'], opportunities: ['free_modules', 'demo_lessons'] },
      { type: 'consideration', name: 'Evaluation', touchpoints: ['website', 'preview', 'reviews'], userActions: ['preview_course', 'read_syllabus', 'check_instructor'], businessActions: ['show_preview', 'display_outcomes', 'show_credentials'], painPoints: ['no_preview', 'unclear_outcomes'], opportunities: ['free_trial', 'money_back_guarantee'] },
      { type: 'conversion', name: 'Enrollment', touchpoints: ['website', 'checkout', 'onboarding'], userActions: ['select_plan', 'enroll', 'start_learning'], businessActions: ['simplify_enrollment', 'offer_payment_plans', 'onboard_effectively'], painPoints: ['complex_enrollment', 'high_upfront_cost'], opportunities: ['installment_plans', 'subscription_model'] },
      { type: 'retention', name: 'Learning', touchpoints: ['app', 'email', 'community'], userActions: ['complete_lessons', 'take_quizzes', 'ask_questions'], businessActions: ['track_progress', 'send_reminders', 'provide_support'], painPoints: ['course_abandonment', 'no_engagement'], opportunities: ['gamification', 'peer_learning'] },
      { type: 'advocacy', name: 'Certification', touchpoints: ['certificate', 'linkedin', 'referral'], userActions: ['earn_certificate', 'share_achievement', 'refer_peer'], businessActions: ['issue_certificate', 'enable_sharing', 'referral_program'], painPoints: ['no_recognition', 'hard_to_share'], opportunities: ['digital_badges', 'alumni_network'] },
    ],
  },
];

// ─── Customer Journey Engine ─────────────────────────────────────

export class CustomerJourneyEngine {
  /**
   * Generate customer journey from capabilities.
   */
  generateJourney(capabilities: string[]): CustomerJourneyGraph {
    const matchedTemplates = JOURNEY_TEMPLATES.filter(t =>
      capabilities.includes(t.capability)
    );

    let stages: JourneyStage[];

    if (matchedTemplates.length > 0) {
      // Use the most relevant template
      const template = matchedTemplates[0]!;
      stages = template.stages.map((stage, i) => ({
        id: `stage_${i}`,
        type: stage.type,
        name: stage.name,
        description: `Customer ${stage.type} phase`,
        touchpoints: stage.touchpoints,
        userActions: stage.userActions,
        businessActions: stage.businessActions,
        painPoints: stage.painPoints,
        opportunities: stage.opportunities,
        metrics: this.getStageMetrics(stage.type),
        automationPotential: this.calculateAutomationPotential(stage),
      }));
    } else {
      stages = this.getDefaultJourney();
    }

    const totalTouchpoints = stages.reduce((sum, s) => sum + s.touchpoints.length, 0);
    const totalPainPoints = stages.reduce((sum, s) => sum + s.painPoints.length, 0);
    const automationScore = Math.round(
      stages.filter(s => s.automationPotential === 'high').length / stages.length * 100
    );

    return {
      stages,
      totalTouchpoints,
      totalPainPoints,
      automationScore,
      recommendedImprovements: this.generateRecommendations(stages, capabilities),
    };
  }

  private getDefaultJourney(): JourneyStage[] {
    return [
      { id: 'stage_0', type: 'awareness', name: 'Discovery', description: 'Customer becomes aware', touchpoints: ['website', 'search', 'social'], userActions: ['find_business', 'learn_about'], businessActions: ['market_services'], painPoints: ['low_visibility'], opportunities: ['seo', 'content'], metrics: ['traffic', 'impressions'], automationPotential: 'medium' },
      { id: 'stage_1', type: 'consideration', name: 'Evaluation', description: 'Customer evaluates options', touchpoints: ['website', 'reviews'], userActions: ['compare_options', 'read_reviews'], businessActions: ['show_social_proof'], painPoints: ['trust_barriers'], opportunities: ['reviews', 'case_studies'], metrics: ['engagement', 'time_on_site'], automationPotential: 'medium' },
      { id: 'stage_2', type: 'conversion', name: 'Purchase', description: 'Customer makes decision', touchpoints: ['website', 'checkout'], userActions: ['make_purchase', 'sign_up'], businessActions: ['convert_lead'], painPoints: ['checkout_friction'], opportunities: ['simplify_checkout'], metrics: ['conversion_rate', 'revenue'], automationPotential: 'high' },
      { id: 'stage_3', type: 'retention', name: 'Experience', description: 'Customer uses product/service', touchpoints: ['app', 'support'], userActions: ['use_product', 'contact_support'], businessActions: ['deliver_value'], painPoints: ['support_issues'], opportunities: ['loyalty_program'], metrics: ['retention_rate', 'satisfaction'], automationPotential: 'high' },
      { id: 'stage_4', type: 'advocacy', name: 'Loyalty', description: 'Customer becomes advocate', touchpoints: ['social', 'referral'], userActions: ['refer_friend', 'leave_review'], businessActions: ['encourage_referrals'], painPoints: ['no_incentive'], opportunities: ['referral_program'], metrics: ['nps', 'referral_rate'], automationPotential: 'medium' },
    ];
  }

  private getStageMetrics(type: JourneyStageType): string[] {
    switch (type) {
      case 'awareness': return ['traffic', 'impressions', 'reach', 'brand_awareness'];
      case 'consideration': return ['engagement', 'time_on_site', 'pages_viewed', 'content_downloads'];
      case 'conversion': return ['conversion_rate', 'cart_abandonment', 'average_order_value', 'revenue'];
      case 'retention': return ['retention_rate', 'churn_rate', 'customer_satisfaction', 'support_tickets'];
      case 'advocacy': return ['nps', 'referral_rate', 'reviews', 'social_shares'];
    }
  }

  private calculateAutomationPotential(stage: { touchpoints: string[]; userActions: string[]; businessActions: string[] }): 'low' | 'medium' | 'high' {
    const digitalTouchpoints = stage.touchpoints.filter(t =>
      ['website', 'app', 'email', 'sms', 'social'].some(d => t.includes(d))
    ).length;

    const ratio = digitalTouchpoints / Math.max(stage.touchpoints.length, 1);
    if (ratio > 0.7) return 'high';
    if (ratio > 0.4) return 'medium';
    return 'low';
  }

  private generateRecommendations(stages: JourneyStage[], capabilities: string[]): string[] {
    const recommendations: string[] = [];

    // Check for common issues
    const awarenessStage = stages.find(s => s.type === 'awareness');
    if (awarenessStage && awarenessStage.touchpoints.length < 3) {
      recommendations.push('Expand awareness touchpoints: add social media, content marketing, and paid ads');
    }

    const conversionStage = stages.find(s => s.type === 'conversion');
    if (conversionStage) {
      if (conversionStage.painPoints.length > 1) {
        recommendations.push('Simplify conversion process: reduce friction points and add trust signals');
      }
    }

    const retentionStage = stages.find(s => s.type === 'retention');
    if (retentionStage && !capabilities.includes('membership') && !capabilities.includes('subscription')) {
      recommendations.push('Add membership or subscription model for recurring revenue');
    }

    const advocacyStage = stages.find(s => s.type === 'advocacy');
    if (advocacyStage && advocacyStage.opportunities.length > 0) {
      recommendations.push('Implement referral program to leverage customer advocacy');
    }

    // General recommendations
    recommendations.push('Implement automated email sequences for each journey stage');
    recommendations.push('Add analytics tracking to measure journey performance');

    return recommendations;
  }
}
