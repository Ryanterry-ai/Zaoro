/**
 * Workflow Engine: Converts business prompts into deterministic business workflows.
 * Domain agnostic, capability driven, no hardcoded templates.
 */

export type Actor = 'customer' | 'staff' | 'system' | 'admin' | 'guest' | 'partner';

export interface WorkflowStep {
  id: string;
  actor: Actor;
  action: string;
  description: string;
  inputs: string[];
  outputs: string[];
  triggersNext: string[];
  isCritical: boolean;
  automationLevel: 'manual' | 'semi-auto' | 'fully-auto';
}

export interface BusinessWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: WorkflowStep[];
  actors: Actor[];
  dataEntities: string[];
  estimatedCycleTime: string;
}

export interface WorkflowGraph {
  workflows: BusinessWorkflow[];
  allActors: Actor[];
  allEntities: string[];
  automationOpportunities: number;
  totalSteps: number;
}

// ─── Capability Detection ────────────────────────────────────────

interface CapabilityPattern {
  capability: string;
  keywords: string[];
  workflows: string[];
  entities: string[];
  actors: Actor[];
}

const CAPABILITY_PATTERNS: CapabilityPattern[] = [
  {
    capability: 'booking',
    keywords: ['book', 'appointment', 'schedule', 'reservation', 'calendar', 'slot'],
    workflows: ['book_service', 'manage_appointment', 'cancel_booking', 'reschedule'],
    entities: ['Appointment', 'TimeSlot', 'Service', 'Customer'],
    actors: ['customer', 'staff', 'system'],
  },
  {
    capability: 'membership',
    keywords: ['membership', 'subscribe', 'subscription', 'plan', 'tier', 'member'],
    workflows: ['purchase_membership', 'manage_subscription', 'upgrade_plan', 'renew_membership'],
    entities: ['Membership', 'Plan', 'Payment', 'Member'],
    actors: ['customer', 'system', 'admin'],
  },
  {
    capability: 'ecommerce',
    keywords: ['shop', 'store', 'buy', 'sell', 'product', 'cart', 'checkout', 'order', 'inventory'],
    workflows: ['browse_products', 'add_to_cart', 'checkout', 'manage_inventory', 'process_order', 'ship_order'],
    entities: ['Product', 'Cart', 'Order', 'Inventory', 'Payment'],
    actors: ['customer', 'staff', 'system'],
  },
  {
    capability: 'marketplace',
    keywords: ['marketplace', 'vendor', 'seller', 'listing', 'commission', 'multi-vendor'],
    workflows: ['list_product', 'process_sale', 'manage_vendor', 'handle_dispute', 'payout_vendor'],
    entities: ['Vendor', 'Listing', 'Sale', 'Payout', 'Review'],
    actors: ['customer', 'staff', 'admin', 'partner'],
  },
  {
    capability: 'crm',
    keywords: ['crm', 'lead', 'pipeline', 'contact', 'prospect', 'deal', 'opportunity'],
    workflows: ['capture_lead', 'qualify_lead', 'manage_pipeline', 'close_deal', 'follow_up'],
    entities: ['Lead', 'Contact', 'Deal', 'Activity', 'Pipeline'],
    actors: ['staff', 'admin'],
  },
  {
    capability: 'education',
    keywords: ['course', 'learn', 'student', 'class', 'lecture', 'curriculum', 'enroll', 'academy'],
    workflows: ['enroll_student', 'deliver_content', 'track_progress', 'grade_assignment', 'issue_certificate'],
    entities: ['Course', 'Student', 'Lesson', 'Assignment', 'Certificate'],
    actors: ['customer', 'staff', 'system'],
  },
  {
    capability: 'fitness',
    keywords: ['gym', 'fitness', 'workout', 'class', 'trainer', 'exercise', 'yoga', 'membership'],
    workflows: ['browse_classes', 'book_class', 'track_workout', 'manage_membership', 'personal_training'],
    entities: ['Class', 'Trainer', 'Workout', 'Membership', 'Schedule'],
    actors: ['customer', 'staff'],
  },
  {
    capability: 'healthcare',
    keywords: ['medical', 'clinic', 'doctor', 'patient', 'appointment', 'health', 'dental', 'therapy'],
    workflows: ['book_appointment', 'check_in_patient', 'medical_record', 'process_insurance', 'follow_up'],
    entities: ['Patient', 'Doctor', 'Appointment', 'MedicalRecord', 'Insurance'],
    actors: ['customer', 'staff', 'system'],
  },
  {
    capability: 'real_estate',
    keywords: ['property', 'listing', 'real estate', 'realtor', 'house', 'apartment', 'mortgage'],
    workflows: ['list_property', 'schedule_viewing', 'make_offer', 'process_application', 'close_deal'],
    entities: ['Property', 'Listing', 'Viewing', 'Application', 'Agent'],
    actors: ['customer', 'staff', 'partner'],
  },
  {
    capability: 'restaurant',
    keywords: ['restaurant', 'menu', 'food', 'dining', 'order', 'delivery', 'chef', 'kitchen'],
    workflows: ['view_menu', 'place_order', 'prepare_food', 'deliver_order', 'process_payment'],
    entities: ['MenuItem', 'Order', 'Table', 'Reservation', 'Delivery'],
    actors: ['customer', 'staff', 'system'],
  },
  {
    capability: 'saas',
    keywords: ['saas', 'software', 'app', 'platform', 'dashboard', 'api', 'integration', 'analytics'],
    workflows: ['sign_up', 'onboard_user', 'manage_subscription', 'track_usage', 'process_billing'],
    entities: ['User', 'Subscription', 'Usage', 'Feature', 'Billing'],
    actors: ['customer', 'system', 'admin'],
  },
  {
    capability: 'content',
    keywords: ['blog', 'content', 'article', 'publish', 'editor', 'cms', 'media'],
    workflows: ['create_content', 'review_content', 'publish_content', 'manage_media', 'analyze_performance'],
    entities: ['Article', 'Author', 'Category', 'Media', 'Comment'],
    actors: ['staff', 'admin', 'guest'],
  },
  {
    capability: 'portfolio',
    keywords: ['portfolio', 'showcase', 'project', 'case study', 'client work', 'freelance'],
    workflows: ['showcase_project', 'contact_inquiry', 'send_proposal', 'manage_client'],
    entities: ['Project', 'Client', 'CaseStudy', 'Testimonial'],
    actors: ['customer', 'staff'],
  },
  {
    capability: 'events',
    keywords: ['event', 'conference', 'wedding', 'party', 'festival', 'ticket', 'venue'],
    workflows: ['create_event', 'sell_tickets', 'manage_guests', 'check_in_attendees', 'post_event_survey'],
    entities: ['Event', 'Ticket', 'Guest', 'Venue', 'Schedule'],
    actors: ['customer', 'staff', 'system'],
  },
  {
    capability: 'services',
    keywords: ['service', 'consulting', 'agency', 'freelancer', 'project', 'proposal', 'invoice'],
    workflows: ['receive_inquiry', 'send_proposal', 'manage_project', 'track_time', 'invoice_client'],
    entities: ['Service', 'Project', 'Proposal', 'Invoice', 'Timesheet'],
    actors: ['customer', 'staff', 'admin'],
  },
  {
    capability: 'nonprofit',
    keywords: ['nonprofit', 'charity', 'donation', 'fundraise', 'volunteer', 'cause'],
    workflows: ['donate', 'manage_campaign', 'recruit_volunteer', 'track_impact', 'send_receipt'],
    entities: ['Donation', 'Campaign', 'Volunteer', 'Impact', 'Receipt'],
    actors: ['customer', 'staff', 'admin'],
  },
  {
    capability: 'automotive',
    keywords: ['car', 'vehicle', 'dealership', 'auto', 'test drive', 'financing', 'inventory'],
    workflows: ['browse_inventory', 'schedule_test_drive', 'apply_financing', 'process_sale', 'schedule_service'],
    entities: ['Vehicle', 'TestDrive', 'Financing', 'Sale', 'ServiceRecord'],
    actors: ['customer', 'staff'],
  },
  {
    capability: 'pet_services',
    keywords: ['pet', 'grooming', 'veterinary', 'boarding', 'dog', 'cat', 'animal'],
    workflows: ['book_grooming', 'schedule_vet', 'board_pet', 'track_health', 'process_payment'],
    entities: ['Pet', 'Grooming', 'VetVisit', 'Boarding', 'HealthRecord'],
    actors: ['customer', 'staff'],
  },
  {
    capability: 'beauty',
    keywords: ['salon', 'beauty', 'hair', 'nail', 'facial', 'spa', 'styling', 'skincare'],
    workflows: ['book_service', 'consultation', 'perform_service', 'sell_products', 'rebook_client'],
    entities: ['Service', 'Stylist', 'Appointment', 'Product', 'Client'],
    actors: ['customer', 'staff'],
  },
  {
    capability: 'analytics',
    keywords: ['analytics', 'report', 'dashboard', 'metrics', 'insights', 'tracking'],
    workflows: ['collect_data', 'process_data', 'generate_report', 'visualize_metrics'],
    entities: ['Report', 'Metric', 'Dashboard', 'DataSource'],
    actors: ['system', 'admin'],
  },
];

// ─── Workflow Generation ─────────────────────────────────────────

export class WorkflowEngine {
  /**
   * Detect capabilities from prompt text.
   */
  detectCapabilities(prompt: string): string[] {
    const lower = prompt.toLowerCase();
    const detected: string[] = [];

    for (const pattern of CAPABILITY_PATTERNS) {
      const matches = pattern.keywords.filter(kw => lower.includes(kw));
      if (matches.length > 0) {
        detected.push(pattern.capability);
      }
    }

    return detected.length > 0 ? detected : ['services'];
  }

  /**
   * Generate workflows from detected capabilities.
   */
  generateWorkflows(prompt: string): WorkflowGraph {
    const capabilities = this.detectCapabilities(prompt);
    const allWorkflows: BusinessWorkflow[] = [];
    const allActors = new Set<Actor>();
    const allEntities = new Set<string>();

    for (const cap of capabilities) {
      const pattern = CAPABILITY_PATTERNS.find(p => p.capability === cap);
      if (!pattern) continue;

      const workflows = this.generateCapabilityWorkflows(cap, pattern, prompt);
      allWorkflows.push(...workflows);

      for (const w of workflows) {
        for (const actor of w.actors) allActors.add(actor);
        for (const entity of w.dataEntities) allEntities.add(entity);
      }
    }

    // Add system workflows
    allWorkflows.push(this.generateAuthWorkflow(capabilities));
    allWorkflows.push(this.generateNotificationWorkflow(capabilities));

    const totalSteps = allWorkflows.reduce((sum, w) => sum + w.steps.length, 0);
    const automationOpps = allWorkflows.reduce((sum, w) =>
      sum + w.steps.filter(s => s.automationLevel !== 'manual').length, 0);

    return {
      workflows: allWorkflows,
      allActors: [...allActors],
      allEntities: [...allEntities],
      automationOpportunities: automationOpps,
      totalSteps,
    };
  }

  private generateCapabilityWorkflows(cap: string, pattern: CapabilityPattern, prompt: string): BusinessWorkflow[] {
    const workflows: BusinessWorkflow[] = [];

    for (const wfName of pattern.workflows) {
      const steps = this.generateWorkflowSteps(cap, wfName, pattern);
      workflows.push({
        id: `${cap}_${wfName}`,
        name: this.formatName(wfName),
        description: `${this.formatName(wfName)} workflow for ${cap}`,
        trigger: this.getWorkflowTrigger(wfName),
        steps,
        actors: [...new Set(steps.map(s => s.actor))],
        dataEntities: pattern.entities,
        estimatedCycleTime: this.estimateCycleTime(steps),
      });
    }

    return workflows;
  }

  private generateWorkflowSteps(capability: string, workflow: string, pattern: CapabilityPattern): WorkflowStep[] {
    // Generate steps based on capability and workflow type
    const steps: WorkflowStep[] = [];
    const stepTemplates = this.getStepTemplates(capability, workflow);

    for (let i = 0; i < stepTemplates.length; i++) {
      const template = stepTemplates[i]!;
      steps.push({
        id: `${workflow}_step_${i}`,
        actor: template.actor,
        action: template.action,
        description: template.description,
        inputs: template.inputs,
        outputs: template.outputs,
        triggersNext: i < stepTemplates.length - 1 ? [`${workflow}_step_${i + 1}`] : [],
        isCritical: template.isCritical,
        automationLevel: template.automationLevel,
      });
    }

    return steps;
  }

  private getStepTemplates(capability: string, workflow: string): Array<{
    actor: Actor;
    action: string;
    description: string;
    inputs: string[];
    outputs: string[];
    isCritical: boolean;
    automationLevel: 'manual' | 'semi-auto' | 'fully-auto';
  }> {
    // Generic step templates based on workflow patterns
    const templates: Array<{
      actor: Actor;
      action: string;
      description: string;
      inputs: string[];
      outputs: string[];
      isCritical: boolean;
      automationLevel: 'manual' | 'semi-auto' | 'fully-auto';
    }> = [];

    if (workflow.includes('book') || workflow.includes('appointment') || workflow.includes('schedule')) {
      templates.push(
        { actor: 'customer', action: 'select_service', description: 'Browse and select a service', inputs: ['service_list'], outputs: ['selected_service'], isCritical: true, automationLevel: 'manual' },
        { actor: 'customer', action: 'select_time', description: 'Choose available time slot', inputs: ['available_slots'], outputs: ['selected_slot'], isCritical: true, automationLevel: 'manual' },
        { actor: 'system', action: 'check_availability', description: 'Verify slot availability', inputs: ['selected_slot'], outputs: ['availability_result'], isCritical: true, automationLevel: 'fully-auto' },
        { actor: 'customer', action: 'confirm_booking', description: 'Confirm and pay for booking', inputs: ['booking_details'], outputs: ['confirmed_booking'], isCritical: true, automationLevel: 'manual' },
        { actor: 'system', action: 'send_confirmation', description: 'Send booking confirmation', inputs: ['confirmed_booking'], outputs: ['confirmation_sent'], isCritical: false, automationLevel: 'fully-auto' },
        { actor: 'system', action: 'send_reminder', description: 'Send reminder before appointment', inputs: ['booking_details'], outputs: ['reminder_sent'], isCritical: false, automationLevel: 'fully-auto' },
      );
    } else if (workflow.includes('purchase') || workflow.includes('checkout') || workflow.includes('order')) {
      templates.push(
        { actor: 'customer', action: 'browse_products', description: 'Browse available products/services', inputs: ['product_catalog'], outputs: ['viewed_products'], isCritical: false, automationLevel: 'manual' },
        { actor: 'customer', action: 'add_to_cart', description: 'Add items to cart', inputs: ['selected_items'], outputs: ['cart_contents'], isCritical: true, automationLevel: 'manual' },
        { actor: 'customer', action: 'checkout', description: 'Complete checkout process', inputs: ['cart_contents', 'payment_info'], outputs: ['order'], isCritical: true, automationLevel: 'manual' },
        { actor: 'system', action: 'process_payment', description: 'Process payment transaction', inputs: ['order', 'payment_info'], outputs: ['payment_result'], isCritical: true, automationLevel: 'fully-auto' },
        { actor: 'system', action: 'fulfill_order', description: 'Process order fulfillment', inputs: ['order'], outputs: ['fulfillment_status'], isCritical: true, automationLevel: 'semi-auto' },
        { actor: 'system', action: 'send_receipt', description: 'Send order confirmation', inputs: ['order', 'payment_result'], outputs: ['receipt_sent'], isCritical: false, automationLevel: 'fully-auto' },
      );
    } else if (workflow.includes('membership') || workflow.includes('subscription')) {
      templates.push(
        { actor: 'customer', action: 'select_plan', description: 'Choose membership plan', inputs: ['plan_options'], outputs: ['selected_plan'], isCritical: true, automationLevel: 'manual' },
        { actor: 'customer', action: 'subscribe', description: 'Complete subscription signup', inputs: ['selected_plan', 'payment_info'], outputs: ['subscription'], isCritical: true, automationLevel: 'manual' },
        { actor: 'system', action: 'activate_membership', description: 'Activate member access', inputs: ['subscription'], outputs: ['active_member'], isCritical: true, automationLevel: 'fully-auto' },
        { actor: 'system', action: 'manage_billing', description: 'Handle recurring billing', inputs: ['subscription'], outputs: ['billing_status'], isCritical: true, automationLevel: 'fully-auto' },
        { actor: 'system', action: 'send_renewal_reminder', description: 'Remind before renewal', inputs: ['subscription'], outputs: ['reminder_sent'], isCritical: false, automationLevel: 'fully-auto' },
      );
    } else if (workflow.includes('lead') || workflow.includes('pipeline') || workflow.includes('deal')) {
      templates.push(
        { actor: 'system', action: 'capture_lead', description: 'Capture lead from form/website', inputs: ['lead_info'], outputs: ['new_lead'], isCritical: true, automationLevel: 'fully-auto' },
        { actor: 'staff', action: 'qualify_lead', description: 'Review and qualify lead', inputs: ['new_lead'], outputs: ['qualified_lead'], isCritical: true, automationLevel: 'manual' },
        { actor: 'staff', action: 'contact_lead', description: 'Reach out to qualified lead', inputs: ['qualified_lead'], outputs: ['contact_log'], isCritical: true, automationLevel: 'manual' },
        { actor: 'staff', action: 'create_proposal', description: 'Generate proposal for lead', inputs: ['qualified_lead'], outputs: ['proposal'], isCritical: true, automationLevel: 'semi-auto' },
        { actor: 'staff', action: 'close_deal', description: 'Finalize deal and process payment', inputs: ['proposal'], outputs: ['closed_deal'], isCritical: true, automationLevel: 'manual' },
        { actor: 'system', action: 'onboard_client', description: 'Automated client onboarding', inputs: ['closed_deal'], outputs: ['onboarded_client'], isCritical: false, automationLevel: 'fully-auto' },
      );
    } else if (workflow.includes('content') || workflow.includes('publish')) {
      templates.push(
        { actor: 'staff', action: 'create_content', description: 'Draft new content', inputs: ['content_brief'], outputs: ['draft'], isCritical: true, automationLevel: 'manual' },
        { actor: 'staff', action: 'review_content', description: 'Review and edit content', inputs: ['draft'], outputs: ['reviewed_content'], isCritical: true, automationLevel: 'manual' },
        { actor: 'admin', action: 'approve_content', description: 'Approve for publication', inputs: ['reviewed_content'], outputs: ['approved_content'], isCritical: true, automationLevel: 'manual' },
        { actor: 'system', action: 'publish_content', description: 'Publish to live site', inputs: ['approved_content'], outputs: ['published_content'], isCritical: true, automationLevel: 'fully-auto' },
        { actor: 'system', action: 'distribute_content', description: 'Share across channels', inputs: ['published_content'], outputs: ['distribution_status'], isCritical: false, automationLevel: 'fully-auto' },
      );
    } else {
      // Generic workflow
      templates.push(
        { actor: 'customer', action: 'initiate_request', description: 'Start service request', inputs: ['request_info'], outputs: ['new_request'], isCritical: true, automationLevel: 'manual' },
        { actor: 'staff', action: 'process_request', description: 'Process the request', inputs: ['new_request'], outputs: ['processed_request'], isCritical: true, automationLevel: 'manual' },
        { actor: 'system', action: 'send_update', description: 'Notify customer of progress', inputs: ['processed_request'], outputs: ['notification_sent'], isCritical: false, automationLevel: 'fully-auto' },
        { actor: 'staff', action: 'complete_request', description: 'Fulfill the request', inputs: ['processed_request'], outputs: ['completed_request'], isCritical: true, automationLevel: 'manual' },
        { actor: 'system', action: 'send_confirmation', description: 'Confirm completion', inputs: ['completed_request'], outputs: ['confirmation_sent'], isCritical: false, automationLevel: 'fully-auto' },
      );
    }

    return templates;
  }

  private generateAuthWorkflow(capabilities: string[]): BusinessWorkflow {
    return {
      id: 'system_auth',
      name: 'Authentication',
      description: 'User authentication and authorization',
      trigger: 'user_login',
      steps: [
        { id: 'auth_0', actor: 'customer', action: 'login', description: 'User enters credentials', inputs: ['email', 'password'], outputs: ['auth_token'], triggersNext: ['auth_1'], isCritical: true, automationLevel: 'manual' },
        { id: 'auth_1', actor: 'system', action: 'validate', description: 'Validate credentials', inputs: ['auth_token'], outputs: ['user_session'], triggersNext: ['auth_2'], isCritical: true, automationLevel: 'fully-auto' },
        { id: 'auth_2', actor: 'system', action: 'authorize', description: 'Check permissions', inputs: ['user_session'], outputs: ['access_level'], triggersNext: [], isCritical: true, automationLevel: 'fully-auto' },
      ],
      actors: ['customer', 'system'],
      dataEntities: ['User', 'Session', 'Permission'],
      estimatedCycleTime: '2 seconds',
    };
  }

  private generateNotificationWorkflow(capabilities: string[]): BusinessWorkflow {
    return {
      id: 'system_notifications',
      name: 'Notifications',
      description: 'Automated notification system',
      trigger: 'event_occurs',
      steps: [
        { id: 'notif_0', actor: 'system', action: 'detect_event', description: 'Detect triggering event', inputs: ['event_data'], outputs: ['trigger'], triggersNext: ['notif_1'], isCritical: false, automationLevel: 'fully-auto' },
        { id: 'notif_1', actor: 'system', action: 'compose_message', description: 'Generate notification content', inputs: ['trigger', 'user_preferences'], outputs: ['message'], triggersNext: ['notif_2'], isCritical: false, automationLevel: 'fully-auto' },
        { id: 'notif_2', actor: 'system', action: 'deliver', description: 'Send via appropriate channel', inputs: ['message'], outputs: ['delivery_status'], triggersNext: [], isCritical: false, automationLevel: 'fully-auto' },
      ],
      actors: ['system'],
      dataEntities: ['Notification', 'UserPreference'],
      estimatedCycleTime: '1 second',
    };
  }

  private formatName(snake: string): string {
    return snake.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  private getWorkflowTrigger(workflow: string): string {
    if (workflow.includes('book')) return 'customer_initiates_booking';
    if (workflow.includes('purchase') || workflow.includes('order')) return 'customer_initiates_purchase';
    if (workflow.includes('membership') || workflow.includes('subscribe')) return 'customer_initiates_subscription';
    if (workflow.includes('lead')) return 'lead_captured';
    if (workflow.includes('content')) return 'content_created';
    return 'user_action';
  }

  private estimateCycleTime(steps: WorkflowStep[]): string {
    const manualSteps = steps.filter(s => s.automationLevel === 'manual').length;
    const autoSteps = steps.filter(s => s.automationLevel === 'fully-auto').length;
    const estimatedMinutes = manualSteps * 5 + autoSteps * 0.1;
    if (estimatedMinutes < 1) return 'Instant';
    if (estimatedMinutes < 60) return `${Math.round(estimatedMinutes)} minutes`;
    return `${Math.round(estimatedMinutes / 60)} hours`;
  }
}
