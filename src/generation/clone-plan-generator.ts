import { ClonePlan, WebsiteAnalysis, ExtractedRoute, ExtractedComponent, ExtractedAsset, DataModel, DataField, DataRelation } from './types.js';

export type CloneStrategy = 'full-clone' | 'structure-clone' | 'style-clone';

export class ClonePlanGenerator {
  generate(analysis: WebsiteAnalysis, strategy: CloneStrategy = 'full-clone'): ClonePlan {
    const routesToBuild = this.selectRoutes(analysis.routes, strategy);
    const componentsToCreate = this.selectComponents(analysis.components, strategy);
    const assetsToDownload = this.selectAssets(analysis.assets, strategy);
    const dataModels = this.inferDataModels(analysis);

    return {
      sourceDomain: analysis.domain,
      routesToBuild,
      componentsToCreate,
      assetsToDownload,
      dataModels,
      designTokens: analysis.designTokens,
      estimatedFiles: this.estimateFileCount(routesToBuild, componentsToCreate),
      strategy,
    };
  }

  generateFromUrls(urls: string[], baseUrl: string): ClonePlan {
    const routes: ExtractedRoute[] = urls.map((url) => {
      try {
        const parsed = new URL(url, baseUrl);
        return {
          path: parsed.pathname,
          title: parsed.pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Page',
          type: (parsed.pathname.startsWith('/api/') ? 'api' : 'page') as 'page' | 'api',
        };
      } catch {
        return {
          path: url,
          title: url,
          type: 'page' as const,
        };
      }
    });

    return {
      sourceDomain: new URL(baseUrl).hostname,
      routesToBuild: routes,
      componentsToCreate: [],
      assetsToDownload: [],
      dataModels: [],
      designTokens: {
        colors: {},
        fonts: [],
        spacing: [],
        borderRadius: [],
        shadows: [],
        breakpoints: {},
      },
      estimatedFiles: routes.length + 2,
      strategy: 'structure-clone',
    };
  }

  private selectRoutes(routes: ExtractedRoute[], strategy: CloneStrategy): ExtractedRoute[] {
    switch (strategy) {
      case 'full-clone':
        return [...routes];
      case 'structure-clone':
        // Only page routes, skip API routes
        return routes.filter((r) => r.type === 'page');
      case 'style-clone':
        // Only the main page for style extraction
        return routes.filter((r) => r.path === '/' || r.path === '');
      default:
        return [...routes];
    }
  }

  private selectComponents(components: ExtractedComponent[], strategy: CloneStrategy): ExtractedComponent[] {
    switch (strategy) {
      case 'full-clone':
        return [...components];
      case 'structure-clone':
        // Core structural components only
        return components.filter((c) =>
          ['layout', 'navigation', 'footer', 'hero', 'section'].includes(c.type)
        );
      case 'style-clone':
        // Minimal - just hero and layout for style reference
        return components.filter((c) =>
          ['layout', 'hero'].includes(c.type)
        );
      default:
        return [...components];
    }
  }

  private selectAssets(assets: ExtractedAsset[], strategy: CloneStrategy): ExtractedAsset[] {
    switch (strategy) {
      case 'full-clone':
        return [...assets];
      case 'structure-clone':
        // Only images, skip fonts/videos
        return assets.filter((a) => a.type === 'image' || a.type === 'icon');
      case 'style-clone':
        // Only key images for style reference
        return assets.filter((a) => a.type === 'image').slice(0, 5);
      default:
        return [...assets];
    }
  }

  private inferDataModels(analysis: WebsiteAnalysis): DataModel[] {
    const models: DataModel[] = [];
    const businessType = analysis.businessType;

    // Base models for all sites
    models.push({
      name: 'Page',
      fields: [
        { name: 'id', type: 'string', required: true, unique: true, description: 'Unique page identifier' },
        { name: 'title', type: 'string', required: true, unique: false, description: 'Page title' },
        { name: 'slug', type: 'string', required: true, unique: true, description: 'URL-friendly identifier' },
        { name: 'content', type: 'json', required: false, unique: false, description: 'Page content blocks' },
        { name: 'createdAt', type: 'date', required: true, unique: false, description: 'Creation timestamp' },
      ],
      relations: [],
    });

    switch (businessType) {
      case 'ecommerce':
        models.push(createProductModel());
        models.push(createCategoryModel());
        models.push(createOrderModel());
        models.push(createCustomerModel());
        break;
      case 'saas':
        models.push(createUserModel());
        models.push(createSubscriptionModel());
        models.push(createWorkspaceModel());
        break;
      case 'blog':
        models.push(createPostModel());
        models.push(createAuthorModel());
        models.push(createCommentModel());
        break;
      case 'local-business':
        models.push(createServiceModel());
        models.push(createBookingModel());
        models.push(createContactModel());
        break;
      case 'portfolio':
        models.push(createProjectModel());
        models.push(createSkillModel());
        break;
      case 'marketplace':
        models.push(createSellerModel());
        models.push(createListingModel());
        models.push(createReviewModel());
        break;
      case 'fitness':
        models.push(createClassModel());
        models.push(createTrainerModel());
        models.push(createMembershipModel());
        break;
      case 'restaurant':
        models.push(createMenuItemModel());
        models.push(createTableModel());
        models.push(createReservationModel());
        break;
      case 'education':
        models.push(createCourseModel());
        models.push(createLessonModel());
        models.push(createEnrollmentModel());
        break;
      case 'healthcare':
        models.push(createDoctorModel());
        models.push(createAppointmentModel());
        models.push(createPatientModel());
        break;
      default:
        break;
    }

    return models;
  }

  private estimateFileCount(routes: ExtractedRoute[], components: ExtractedComponent[]): number {
    const pageFiles = routes.length;
    const componentFiles = components.length;
    const layoutFiles = 2; // root layout + default layout
    const apiFiles = routes.filter((r) => r.type === 'api').length;
    const configFiles = 3; // package.json, tsconfig.json, next.config.js
    return pageFiles + componentFiles + layoutFiles + apiFiles + configFiles;
  }
}

function createProductModel(): DataModel {
  return {
    name: 'Product',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique product ID' },
      { name: 'name', type: 'string', required: true, unique: false, description: 'Product name' },
      { name: 'description', type: 'string', required: false, unique: false, description: 'Product description' },
      { name: 'price', type: 'price', required: true, unique: false, description: 'Product price' },
      { name: 'images', type: 'json', required: false, unique: false, description: 'Product image URLs' },
      { name: 'sku', type: 'string', required: true, unique: true, description: 'Stock keeping unit' },
      { name: 'stock', type: 'number', required: true, unique: false, description: 'Available inventory' },
      { name: 'categoryId', type: 'string', required: false, unique: false, description: 'Category reference' },
    ],
    relations: [
      { type: 'many-to-many', target: 'Category', foreignKey: 'categoryId' },
    ],
  };
}

function createCategoryModel(): DataModel {
  return {
    name: 'Category',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique category ID' },
      { name: 'name', type: 'string', required: true, unique: false, description: 'Category name' },
      { name: 'slug', type: 'string', required: true, unique: true, description: 'URL-friendly name' },
      { name: 'description', type: 'string', required: false, unique: false, description: 'Category description' },
    ],
    relations: [{ type: 'one-to-many', target: 'Product' }],
  };
}

function createOrderModel(): DataModel {
  return {
    name: 'Order',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique order ID' },
      { name: 'customerId', type: 'string', required: true, unique: false, description: 'Customer reference' },
      { name: 'status', type: 'string', required: true, unique: false, description: 'Order status' },
      { name: 'total', type: 'price', required: true, unique: false, description: 'Order total' },
      { name: 'items', type: 'json', required: true, unique: false, description: 'Order line items' },
      { name: 'createdAt', type: 'date', required: true, unique: false, description: 'Order date' },
    ],
    relations: [{ type: 'one-to-many', target: 'Customer', foreignKey: 'customerId' }],
  };
}

function createCustomerModel(): DataModel {
  return {
    name: 'Customer',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique customer ID' },
      { name: 'email', type: 'email', required: true, unique: true, description: 'Customer email' },
      { name: 'name', type: 'string', required: true, unique: false, description: 'Full name' },
      { name: 'phone', type: 'string', required: false, unique: false, description: 'Phone number' },
      { name: 'address', type: 'json', required: false, unique: false, description: 'Shipping address' },
    ],
    relations: [{ type: 'one-to-many', target: 'Order' }],
  };
}

function createUserModel(): DataModel {
  return {
    name: 'User',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique user ID' },
      { name: 'email', type: 'email', required: true, unique: true, description: 'User email' },
      { name: 'name', type: 'string', required: true, unique: false, description: 'Full name' },
      { name: 'password', type: 'string', required: true, unique: false, description: 'Hashed password' },
      { name: 'role', type: 'string', required: true, unique: false, description: 'User role' },
    ],
    relations: [{ type: 'one-to-many', target: 'Workspace' }],
  };
}

function createSubscriptionModel(): DataModel {
  return {
    name: 'Subscription',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique subscription ID' },
      { name: 'userId', type: 'string', required: true, unique: false, description: 'User reference' },
      { name: 'plan', type: 'string', required: true, unique: false, description: 'Subscription plan' },
      { name: 'status', type: 'string', required: true, unique: false, description: 'Subscription status' },
      { name: 'startDate', type: 'date', required: true, unique: false, description: 'Start date' },
      { name: 'endDate', type: 'date', required: false, unique: false, description: 'End date' },
    ],
    relations: [{ type: 'one-to-many', target: 'User', foreignKey: 'userId' }],
  };
}

function createWorkspaceModel(): DataModel {
  return {
    name: 'Workspace',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique workspace ID' },
      { name: 'name', type: 'string', required: true, unique: false, description: 'Workspace name' },
      { name: 'ownerId', type: 'string', required: true, unique: false, description: 'Owner user ID' },
      { name: 'plan', type: 'string', required: true, unique: false, description: 'Workspace plan' },
    ],
    relations: [{ type: 'one-to-many', target: 'User', foreignKey: 'ownerId' }],
  };
}

function createPostModel(): DataModel {
  return {
    name: 'Post',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique post ID' },
      { name: 'title', type: 'string', required: true, unique: false, description: 'Post title' },
      { name: 'slug', type: 'string', required: true, unique: true, description: 'URL-friendly title' },
      { name: 'content', type: 'string', required: true, unique: false, description: 'Post content (markdown)' },
      { name: 'excerpt', type: 'string', required: false, unique: false, description: 'Post excerpt' },
      { name: 'authorId', type: 'string', required: true, unique: false, description: 'Author reference' },
      { name: 'publishedAt', type: 'date', required: false, unique: false, description: 'Publication date' },
    ],
    relations: [{ type: 'one-to-many', target: 'Author', foreignKey: 'authorId' }],
  };
}

function createAuthorModel(): DataModel {
  return {
    name: 'Author',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique author ID' },
      { name: 'name', type: 'string', required: true, unique: false, description: 'Author name' },
      { name: 'email', type: 'email', required: true, unique: true, description: 'Author email' },
      { name: 'bio', type: 'string', required: false, unique: false, description: 'Author biography' },
      { name: 'avatar', type: 'image', required: false, unique: false, description: 'Author avatar URL' },
    ],
    relations: [{ type: 'one-to-many', target: 'Post' }],
  };
}

function createCommentModel(): DataModel {
  return {
    name: 'Comment',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique comment ID' },
      { name: 'postId', type: 'string', required: true, unique: false, description: 'Post reference' },
      { name: 'author', type: 'string', required: true, unique: false, description: 'Commenter name' },
      { name: 'content', type: 'string', required: true, unique: false, description: 'Comment content' },
      { name: 'createdAt', type: 'date', required: true, unique: false, description: 'Comment date' },
    ],
    relations: [{ type: 'one-to-many', target: 'Post', foreignKey: 'postId' }],
  };
}

function createServiceModel(): DataModel {
  return {
    name: 'Service',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique service ID' },
      { name: 'name', type: 'string', required: true, unique: false, description: 'Service name' },
      { name: 'description', type: 'string', required: false, unique: false, description: 'Service description' },
      { name: 'price', type: 'price', required: false, unique: false, description: 'Service price' },
      { name: 'duration', type: 'number', required: false, unique: false, description: 'Duration in minutes' },
    ],
    relations: [],
  };
}

function createBookingModel(): DataModel {
  return {
    name: 'Booking',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique booking ID' },
      { name: 'serviceId', type: 'string', required: true, unique: false, description: 'Service reference' },
      { name: 'customerName', type: 'string', required: true, unique: false, description: 'Customer name' },
      { name: 'customerEmail', type: 'email', required: true, unique: false, description: 'Customer email' },
      { name: 'date', type: 'date', required: true, unique: false, description: 'Booking date' },
      { name: 'status', type: 'string', required: true, unique: false, description: 'Booking status' },
    ],
    relations: [{ type: 'one-to-many', target: 'Service', foreignKey: 'serviceId' }],
  };
}

function createContactModel(): DataModel {
  return {
    name: 'Contact',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique contact ID' },
      { name: 'name', type: 'string', required: true, unique: false, description: 'Contact name' },
      { name: 'email', type: 'email', required: true, unique: false, description: 'Contact email' },
      { name: 'message', type: 'string', required: true, unique: false, description: 'Contact message' },
      { name: 'createdAt', type: 'date', required: true, unique: false, description: 'Submission date' },
    ],
    relations: [],
  };
}

function createProjectModel(): DataModel {
  return {
    name: 'Project',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique project ID' },
      { name: 'title', type: 'string', required: true, unique: false, description: 'Project title' },
      { name: 'description', type: 'string', required: false, unique: false, description: 'Project description' },
      { name: 'image', type: 'image', required: false, unique: false, description: 'Project screenshot' },
      { name: 'url', type: 'string', required: false, unique: false, description: 'Live project URL' },
      { name: 'technologies', type: 'json', required: false, unique: false, description: 'Technologies used' },
    ],
    relations: [],
  };
}

function createSkillModel(): DataModel {
  return {
    name: 'Skill',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique skill ID' },
      { name: 'name', type: 'string', required: true, unique: false, description: 'Skill name' },
      { name: 'level', type: 'number', required: true, unique: false, description: 'Proficiency level (1-100)' },
      { name: 'category', type: 'string', required: false, unique: false, description: 'Skill category' },
    ],
    relations: [],
  };
}

function createSellerModel(): DataModel {
  return {
    name: 'Seller',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique seller ID' },
      { name: 'name', type: 'string', required: true, unique: false, description: 'Seller name' },
      { name: 'email', type: 'email', required: true, unique: true, description: 'Seller email' },
      { name: 'rating', type: 'number', required: false, unique: false, description: 'Average rating' },
    ],
    relations: [{ type: 'one-to-many', target: 'Listing' }],
  };
}

function createListingModel(): DataModel {
  return {
    name: 'Listing',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique listing ID' },
      { name: 'sellerId', type: 'string', required: true, unique: false, description: 'Seller reference' },
      { name: 'title', type: 'string', required: true, unique: false, description: 'Listing title' },
      { name: 'description', type: 'string', required: false, unique: false, description: 'Listing description' },
      { name: 'price', type: 'price', required: true, unique: false, description: 'Listing price' },
      { name: 'images', type: 'json', required: false, unique: false, description: 'Listing images' },
      { name: 'status', type: 'string', required: true, unique: false, description: 'Listing status' },
    ],
    relations: [{ type: 'one-to-many', target: 'Seller', foreignKey: 'sellerId' }],
  };
}

function createReviewModel(): DataModel {
  return {
    name: 'Review',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique review ID' },
      { name: 'listingId', type: 'string', required: true, unique: false, description: 'Listing reference' },
      { name: 'author', type: 'string', required: true, unique: false, description: 'Reviewer name' },
      { name: 'rating', type: 'number', required: true, unique: false, description: 'Rating (1-5)' },
      { name: 'content', type: 'string', required: false, unique: false, description: 'Review content' },
    ],
    relations: [{ type: 'one-to-many', target: 'Listing', foreignKey: 'listingId' }],
  };
}

function createClassModel(): DataModel {
  return {
    name: 'FitnessClass',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique class ID' },
      { name: 'name', type: 'string', required: true, unique: false, description: 'Class name' },
      { name: 'trainerId', type: 'string', required: true, unique: false, description: 'Trainer reference' },
      { name: 'schedule', type: 'json', required: true, unique: false, description: 'Class schedule' },
      { name: 'capacity', type: 'number', required: true, unique: false, description: 'Max participants' },
      { name: 'duration', type: 'number', required: true, unique: false, description: 'Duration in minutes' },
    ],
    relations: [{ type: 'one-to-many', target: 'Trainer', foreignKey: 'trainerId' }],
  };
}

function createTrainerModel(): DataModel {
  return {
    name: 'Trainer',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique trainer ID' },
      { name: 'name', type: 'string', required: true, unique: false, description: 'Trainer name' },
      { name: 'specialty', type: 'string', required: false, unique: false, description: 'Training specialty' },
      { name: 'bio', type: 'string', required: false, unique: false, description: 'Trainer biography' },
      { name: 'avatar', type: 'image', required: false, unique: false, description: 'Trainer photo' },
    ],
    relations: [{ type: 'one-to-many', target: 'FitnessClass' }],
  };
}

function createMembershipModel(): DataModel {
  return {
    name: 'Membership',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique membership ID' },
      { name: 'name', type: 'string', required: true, unique: false, description: 'Membership tier' },
      { name: 'price', type: 'price', required: true, unique: false, description: 'Monthly price' },
      { name: 'features', type: 'json', required: false, unique: false, description: 'Included features' },
    ],
    relations: [],
  };
}

function createMenuItemModel(): DataModel {
  return {
    name: 'MenuItem',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique menu item ID' },
      { name: 'name', type: 'string', required: true, unique: false, description: 'Item name' },
      { name: 'description', type: 'string', required: false, unique: false, description: 'Item description' },
      { name: 'price', type: 'price', required: true, unique: false, description: 'Item price' },
      { name: 'category', type: 'string', required: true, unique: false, description: 'Menu category' },
      { name: 'image', type: 'image', required: false, unique: false, description: 'Item photo' },
    ],
    relations: [],
  };
}

function createTableModel(): DataModel {
  return {
    name: 'Table',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique table ID' },
      { name: 'number', type: 'number', required: true, unique: true, description: 'Table number' },
      { name: 'capacity', type: 'number', required: true, unique: false, description: 'Seating capacity' },
      { name: 'status', type: 'string', required: true, unique: false, description: 'Table status' },
    ],
    relations: [],
  };
}

function createReservationModel(): DataModel {
  return {
    name: 'Reservation',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique reservation ID' },
      { name: 'tableId', type: 'string', required: true, unique: false, description: 'Table reference' },
      { name: 'customerName', type: 'string', required: true, unique: false, description: 'Customer name' },
      { name: 'customerEmail', type: 'email', required: true, unique: false, description: 'Customer email' },
      { name: 'date', type: 'date', required: true, unique: false, description: 'Reservation date' },
      { name: 'partySize', type: 'number', required: true, unique: false, description: 'Number of guests' },
      { name: 'status', type: 'string', required: true, unique: false, description: 'Reservation status' },
    ],
    relations: [{ type: 'one-to-many', target: 'Table', foreignKey: 'tableId' }],
  };
}

function createCourseModel(): DataModel {
  return {
    name: 'Course',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique course ID' },
      { name: 'title', type: 'string', required: true, unique: false, description: 'Course title' },
      { name: 'description', type: 'string', required: false, unique: false, description: 'Course description' },
      { name: 'instructor', type: 'string', required: true, unique: false, description: 'Instructor name' },
      { name: 'price', type: 'price', required: false, unique: false, description: 'Course price' },
      { name: 'duration', type: 'number', required: false, unique: false, description: 'Total duration in hours' },
    ],
    relations: [{ type: 'one-to-many', target: 'Lesson' }],
  };
}

function createLessonModel(): DataModel {
  return {
    name: 'Lesson',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique lesson ID' },
      { name: 'courseId', type: 'string', required: true, unique: false, description: 'Course reference' },
      { name: 'title', type: 'string', required: true, unique: false, description: 'Lesson title' },
      { name: 'content', type: 'string', required: true, unique: false, description: 'Lesson content' },
      { name: 'order', type: 'number', required: true, unique: false, description: 'Sort order' },
      { name: 'duration', type: 'number', required: false, unique: false, description: 'Duration in minutes' },
    ],
    relations: [{ type: 'one-to-many', target: 'Course', foreignKey: 'courseId' }],
  };
}

function createEnrollmentModel(): DataModel {
  return {
    name: 'Enrollment',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique enrollment ID' },
      { name: 'courseId', type: 'string', required: true, unique: false, description: 'Course reference' },
      { name: 'studentEmail', type: 'email', required: true, unique: false, description: 'Student email' },
      { name: 'enrolledAt', type: 'date', required: true, unique: false, description: 'Enrollment date' },
      { name: 'status', type: 'string', required: true, unique: false, description: 'Enrollment status' },
    ],
    relations: [{ type: 'one-to-many', target: 'Course', foreignKey: 'courseId' }],
  };
}

function createDoctorModel(): DataModel {
  return {
    name: 'Doctor',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique doctor ID' },
      { name: 'name', type: 'string', required: true, unique: false, description: 'Doctor name' },
      { name: 'specialty', type: 'string', required: true, unique: false, description: 'Medical specialty' },
      { name: 'bio', type: 'string', required: false, unique: false, description: 'Doctor biography' },
      { name: 'avatar', type: 'image', required: false, unique: false, description: 'Doctor photo' },
    ],
    relations: [{ type: 'one-to-many', target: 'Appointment' }],
  };
}

function createAppointmentModel(): DataModel {
  return {
    name: 'Appointment',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique appointment ID' },
      { name: 'doctorId', type: 'string', required: true, unique: false, description: 'Doctor reference' },
      { name: 'patientEmail', type: 'email', required: true, unique: false, description: 'Patient email' },
      { name: 'date', type: 'date', required: true, unique: false, description: 'Appointment date' },
      { name: 'reason', type: 'string', required: false, unique: false, description: 'Visit reason' },
      { name: 'status', type: 'string', required: true, unique: false, description: 'Appointment status' },
    ],
    relations: [{ type: 'one-to-many', target: 'Doctor', foreignKey: 'doctorId' }],
  };
}

function createPatientModel(): DataModel {
  return {
    name: 'Patient',
    fields: [
      { name: 'id', type: 'string', required: true, unique: true, description: 'Unique patient ID' },
      { name: 'name', type: 'string', required: true, unique: false, description: 'Patient name' },
      { name: 'email', type: 'email', required: true, unique: true, description: 'Patient email' },
      { name: 'phone', type: 'string', required: false, unique: false, description: 'Phone number' },
      { name: 'dateOfBirth', type: 'date', required: false, unique: false, description: 'Date of birth' },
    ],
    relations: [],
  };
}
