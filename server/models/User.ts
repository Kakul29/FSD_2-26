import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUserProfile {
  allergies: string[];
  dietaryPreferences: string[];
  goals: string[];
  healthConditions: string[];
}

export interface IProductHistoryItem {
  barcode: string;
  name: string;
  brand: string;
  image?: string;
  healthScore?: number;
  viewedAt: Date;
}

export interface IFavoriteItem {
  barcode: string;
  name: string;
  brand: string;
  image?: string;
  healthScore?: number;
  notes?: string;
  savedAt: Date;
}

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  profile: IUserProfile;
  history: IProductHistoryItem[];
  favorites: IFavoriteItem[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    profile: {
      allergies: {
        type: [String],
        default: [],
      },
      dietaryPreferences: {
        type: [String],
        default: ['vegetarian'],
      },
      goals: {
        type: [String],
        default: ['reduce_sugar', 'less_processed'],
      },
      healthConditions: {
        type: [String],
        default: [],
      },
    },
    history: [
      {
        barcode: String,
        name: String,
        brand: String,
        image: String,
        healthScore: Number,
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    favorites: [
      {
        barcode: String,
        name: String,
        brand: String,
        image: String,
        healthScore: Number,
        notes: String,
        savedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password helper
UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

// Check if model already exists to avoid overwrite during dev reload
export const MongooseUserModel =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

// In-memory persistent fallback repository
interface InMemoryUser {
  _id: string;
  email: string;
  password: string;
  name: string;
  profile: IUserProfile;
  history: IProductHistoryItem[];
  favorites: IFavoriteItem[];
  createdAt: Date;
  updatedAt: Date;
}

const inMemoryUsers: Map<string, InMemoryUser> = new Map();

// Seed initial demo student user
async function seedDemoUser() {
  const demoEmail = 'student@labellens.dev';
  if (!inMemoryUsers.has(demoEmail)) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    inMemoryUsers.set(demoEmail, {
      _id: 'user_demo_fed_101',
      email: demoEmail,
      password: hashedPassword,
      name: 'Aarav Sharma',
      profile: {
        allergies: ['peanuts', 'milk'],
        dietaryPreferences: ['vegetarian'],
        goals: ['reduce_sugar', 'less_processed', 'increase_protein'],
        healthConditions: ['high_blood_pressure'],
      },
      history: [
        {
          barcode: '8901058862392',
          name: 'Maggi 2-Minute Masala Noodles',
          brand: 'Nestlé',
          image: 'https://images.openfoodfacts.org/images/products/890/105/886/2392/front_en.11.400.jpg',
          healthScore: 38,
          viewedAt: new Date(Date.now() - 3600000),
        },
      ],
      favorites: [
        {
          barcode: '8906109960012',
          name: 'Millet Noodles (Foxtail & Little Millet)',
          brand: 'Slurrp Farm',
          image: 'https://images.openfoodfacts.org/images/products/890/610/996/0012/front_en.3.400.jpg',
          healthScore: 78,
          notes: 'Great zero-maida alternative to Maggi!',
          savedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
seedDemoUser();

export class UserRepository {
  static async findByEmail(email: string) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await MongooseUserModel.findOne({ email: email.toLowerCase().trim() });
      } catch (err) {
        console.error('Mongoose findByEmail error, falling back:', err);
      }
    }
    const user = inMemoryUsers.get(email.toLowerCase().trim());
    if (!user) return null;
    return {
      ...user,
      id: user._id,
      comparePassword: async (candidate: string) => bcrypt.compare(candidate, user.password),
    };
  }

  static async findById(id: string) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await MongooseUserModel.findById(id).select('-password');
      } catch (err) {
        console.error('Mongoose findById error, falling back:', err);
      }
    }
    for (const user of inMemoryUsers.values()) {
      if (user._id === id) {
        const { password, ...rest } = user;
        return { ...rest, id: user._id };
      }
    }
    return null;
  }

  static async createUser(userData: {
    email: string;
    password: string;
    name: string;
    profile?: Partial<IUserProfile>;
  }) {
    const cleanEmail = userData.email.toLowerCase().trim();

    if (mongoose.connection.readyState === 1) {
      try {
        const newUser = new MongooseUserModel({
          ...userData,
          email: cleanEmail,
        });
        await newUser.save();
        return newUser;
      } catch (err) {
        console.error('Mongoose createUser error:', err);
      }
    }

    // Fallback store
    if (inMemoryUsers.has(cleanEmail)) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const id = 'user_' + Math.random().toString(36).substring(2, 11);
    const newRecord: InMemoryUser = {
      _id: id,
      email: cleanEmail,
      password: hashedPassword,
      name: userData.name.trim(),
      profile: {
        allergies: userData.profile?.allergies || [],
        dietaryPreferences: userData.profile?.dietaryPreferences || ['vegetarian'],
        goals: userData.profile?.goals || ['reduce_sugar', 'less_processed'],
        healthConditions: userData.profile?.healthConditions || [],
      },
      history: [],
      favorites: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryUsers.set(cleanEmail, newRecord);
    return {
      ...newRecord,
      id: newRecord._id,
      comparePassword: async (candidate: string) => bcrypt.compare(candidate, newRecord.password),
    };
  }

  static async updateProfile(id: string, profile: Partial<IUserProfile>) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await MongooseUserModel.findByIdAndUpdate(
          id,
          { $set: { profile: profile } },
          { new: true }
        ).select('-password');
      } catch (err) {
        console.error('Mongoose updateProfile error:', err);
      }
    }

    for (const user of inMemoryUsers.values()) {
      if (user._id === id) {
        user.profile = {
          ...user.profile,
          ...profile,
        };
        user.updatedAt = new Date();
        const { password, ...rest } = user;
        return { ...rest, id: user._id };
      }
    }
    return null;
  }

  static async addHistory(id: string, item: Omit<IProductHistoryItem, 'viewedAt'>) {
    const historyItem: IProductHistoryItem = {
      ...item,
      viewedAt: new Date(),
    };

    if (mongoose.connection.readyState === 1) {
      try {
        // Remove existing item with same barcode, keep last 20
        await MongooseUserModel.findByIdAndUpdate(id, {
          $pull: { history: { barcode: item.barcode } },
        });
        return await MongooseUserModel.findByIdAndUpdate(
          id,
          {
            $push: {
              history: {
                $each: [historyItem],
                $position: 0,
                $slice: 20,
              },
            },
          },
          { new: true }
        );
      } catch (err) {
        console.error('Mongoose addHistory error:', err);
      }
    }

    for (const user of inMemoryUsers.values()) {
      if (user._id === id) {
        user.history = user.history.filter((h) => h.barcode !== item.barcode);
        user.history.unshift(historyItem);
        if (user.history.length > 20) user.history.pop();
        return user;
      }
    }
    return null;
  }

  static async addFavorite(id: string, fav: Omit<IFavoriteItem, 'savedAt'>) {
    const favoriteItem: IFavoriteItem = {
      ...fav,
      savedAt: new Date(),
    };

    if (mongoose.connection.readyState === 1) {
      try {
        await MongooseUserModel.findByIdAndUpdate(id, {
          $pull: { favorites: { barcode: fav.barcode } },
        });
        return await MongooseUserModel.findByIdAndUpdate(
          id,
          {
            $push: {
              favorites: {
                $each: [favoriteItem],
                $position: 0,
              },
            },
          },
          { new: true }
        );
      } catch (err) {
        console.error('Mongoose addFavorite error:', err);
      }
    }

    for (const user of inMemoryUsers.values()) {
      if (user._id === id) {
        user.favorites = user.favorites.filter((f) => f.barcode !== fav.barcode);
        user.favorites.unshift(favoriteItem);
        return user;
      }
    }
    return null;
  }

  static async removeFavorite(id: string, barcode: string) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await MongooseUserModel.findByIdAndUpdate(
          id,
          {
            $pull: { favorites: { barcode } },
          },
          { new: true }
        );
      } catch (err) {
        console.error('Mongoose removeFavorite error:', err);
      }
    }

    for (const user of inMemoryUsers.values()) {
      if (user._id === id) {
        user.favorites = user.favorites.filter((f) => f.barcode !== barcode);
        return user;
      }
    }
    return null;
  }
}
