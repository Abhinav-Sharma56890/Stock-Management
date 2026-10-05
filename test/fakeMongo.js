class FakeMongoDb {
  constructor() {
    this.collections = new Map();
  }

  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new FakeCollection());
    }
    return this.collections.get(name);
  }

  async close() {}
}

class FakeCollection {
  constructor() {
    this.documents = [];
    this.nextId = 1;
  }

  async createIndex() {}

  async insertOne(document) {
    const inserted = {
      ...document,
      _id: document._id || String(this.nextId++),
    };
    this.documents.push(inserted);
    return { insertedId: inserted._id };
  }

  async findOne(query) {
    return this.documents.find((document) => matches(document, query)) || null;
  }

  find(query = {}) {
    let rows = this.documents.filter((document) => matches(document, query));
    return {
      sort(sortSpec) {
        rows = rows.slice().sort((left, right) => compareBySort(left, right, sortSpec));
        return this;
      },
      async toArray() {
        return rows.slice();
      },
    };
  }

  async updateOne(query, update) {
    const document = this.documents.find((row) => matches(row, query));
    if (document) {
      if (update.$set) {
        Object.assign(document, update.$set);
      }
      if (update.$unset) {
        for (const key of Object.keys(update.$unset)) {
          delete document[key];
        }
      }
    }
    return { matchedCount: document ? 1 : 0, modifiedCount: document ? 1 : 0 };
  }

  async deleteOne(query) {
    const index = this.documents.findIndex((document) => matches(document, query));
    if (index === -1) return { deletedCount: 0 };
    this.documents.splice(index, 1);
    return { deletedCount: 1 };
  }

  async deleteMany(query) {
    const before = this.documents.length;
    this.documents = this.documents.filter((document) => !matches(document, query));
    return { deletedCount: before - this.documents.length };
  }
}

function matches(document, query) {
  return Object.entries(query).every(([key, expected]) => {
    const actual = document[key];
    if (expected && typeof expected === "object") {
      if ("$regex" in expected) {
        const flags = expected.$options || "";
        return new RegExp(expected.$regex, flags).test(String(actual || ""));
      }
      if ("$gt" in expected) {
        return String(actual) > String(expected.$gt);
      }
    }
    return String(actual) === String(expected);
  });
}

function compareBySort(left, right, sortSpec) {
  for (const [key, direction] of Object.entries(sortSpec)) {
    if (left[key] < right[key]) return -1 * direction;
    if (left[key] > right[key]) return 1 * direction;
  }
  return 0;
}

module.exports = {
  FakeMongoDb,
};
