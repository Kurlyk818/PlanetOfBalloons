import mongoose from 'mongoose';
import dotenv from 'dotenv';
import https from 'https';
import cloudinary from './config/cloudinary.js';
import Product from './models/Product.js';
import Category from './models/Category.js';
import Promotion from './models/Promotion.js';
import Announcement from './models/Announcement.js';

import products from './mockData/products.js';
import categories from './mockData/category.js';
import promotions from './mockData/promotions.js';
import announcements from './mockData/announcement.js';

dotenv.config();

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    // Clear existing data
    await Product.deleteMany();
    await Category.deleteMany();
    await Promotion.deleteMany();
    await Announcement.deleteMany();

    console.log('Existing data cleared. Starting import...');
    
    // Process and insert data
    const processedCategories = await processImagesForItems(categories, 'categories');
    const createdCategories = await Category.create(processedCategories);
    console.log(`${createdCategories.length} categories created`);

    // Map category names to MongoDB IDs
    const categoryMap = {};
    createdCategories.forEach(category => {
      categoryMap[category.name] = category._id;
    });

    // Process products and add valid category references
    const processedProducts = await processImagesForItems(products, 'products');
    const productsWithCategories = processedProducts.map(product => {
      return {...product, category: categoryMap[product.categoryName]};
    });

    const createdProducts = await Product.create(productsWithCategories);
    console.log(`${createdProducts.length} products created`);

    // Add product references to categories
    for (const product of createdProducts) {
      const category = await Category.findById(product.category);
      category.products.push(product._id);
      await category.save();
    }
    
    // Process and insert promotions
    const processedPromotions = await processImagesForItems(promotions, 'promotions');
    await Promotion.create(processedPromotions);
    console.log(`${processedPromotions.length} promotions created`);
    
    // Process and insert announcements
    const processedAnnouncements = await processImagesForItems(announcements, 'announcements');
    await Announcement.create(processedAnnouncements);
    console.log(`${processedAnnouncements.length} announcements created`);

    console.log('Data import successful!');
    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
};

// Download image from URL directly to Cloudinary using streaming
const uploadImageFromUrl = async (imageUrl, folder) => {
  try {
    return new Promise((resolve, reject) => {
      https.get(imageUrl, (response) => {
        if (response.statusCode !== 200) {
          return reject(new Error(`Failed to download image, status code: ${response.statusCode}`));
        }
        
        const uploadStream = cloudinary.uploader.upload_stream({
          folder: `planet-of-balloons/${folder}`,
          transformation: [
            { width: 1000, crop: 'limit' },
            { quality: 'auto' }
          ]
        }, (error, result) => {
          if (error) {
            return reject(new Error(`Cloudinary upload failed: ${error.message}`));
          }
          return resolve({
            url: result.secure_url,
            id: result.public_id
          });
        });
        
        response.pipe(uploadStream);
      }).on('error', (err) => {
        reject(new Error(`Failed to download image: ${err.message}`));
      });
    });
  } catch (error) {
    console.error('Error uploading from URL to Cloudinary:', error);
    throw error;
  }
};

// Process an array of items with images
const processImagesForItems = async (items, folderName) => {
  const processedItems = [];
  
  for (const item of items) {
    try {
      if (item.image) {
        // Upload directly to Cloudinary from URL
        const uploadResult = await uploadImageFromUrl(item.image, folderName);
        
        // Replace original image URL with Cloudinary URL
        const processedItem = {
          ...item,
          image: uploadResult.url,
          cloudinaryId: uploadResult.id
        };
        
        processedItems.push(processedItem);
      } else {
        processedItems.push(item);
      }
    } catch (error) {
      console.error(`Error processing image for item ${item.name || 'unnamed'}:`, error);
      // Add the item without the image
      processedItems.push({...item, image: null, cloudinaryId: null});
    }
  }
  
  return processedItems;
};

// Start the import process
start();