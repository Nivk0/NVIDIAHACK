const { v4: uuidv4 } = require('uuid');

class CompressionAgent {
  async process(sentiments) {

    if (!sentiments || sentiments.length === 0) {
      return [];
    }


    const clusters = this.clusterMemories(sentiments);


    sentiments.forEach(memory => {
      const cluster = clusters.find(c => c.memoryIds.includes(memory.id));
      if (cluster) {
        memory.cluster = cluster.id;
        memory.clusterName = cluster.name;
      }
    });

    return clusters;
  }

  clusterMemories(memories) {

    return this.clusterByAction(memories);
  }

  clusterByAction(memories) {

    const actionGroups = {
      'keep': [],
      'compress': [],
      'low_relevance': [],
      'delete': []
    };


    memories.forEach(memory => {
      let action = memory.overrideAction || memory.predictedAction || memory.nemotronAnalysis?.predictedAction || 'keep';

      const normalizedAction = action.toLowerCase();
      if (normalizedAction === 'forget') {
        action = 'low_relevance';
      }
      if (actionGroups[action]) {
        actionGroups[action].push(memory.id);
      } else if (normalizedAction === 'forget') {

        actionGroups.low_relevance.push(memory.id);
      } else {

        actionGroups.keep.push(memory.id);
      }
    });


    const clusters = [];
    const actionNames = {
      'keep': 'Keep',
      'compress': 'Compress',
      'low_relevance': 'Low Future Relevance',
      'delete': 'Delete'
    };

    Object.entries(actionGroups).forEach(([action, memoryIds]) => {
      if (memoryIds.length > 0) {
        clusters.push({
          id: uuidv4(),
          name: actionNames[action],
          type: 'action',
          action: action,
          memoryIds,
          size: memoryIds.length,
          totalSize: memories.filter(m => memoryIds.includes(m.id))
            .reduce((sum, m) => sum + (m.size || 0), 0)
        });
      }
    });

    return clusters;
  }

  clusterByType(memories) {
    const typeGroups = {};

    memories.forEach(memory => {
      if (!typeGroups[memory.type]) {
        typeGroups[memory.type] = [];
      }
      typeGroups[memory.type].push(memory.id);
    });

    return Object.entries(typeGroups).map(([type, memoryIds]) => ({
      id: uuidv4(),
      name: `${type} cluster`,
      type: 'type',
      memoryIds,
      action: this.getClusterAction(memories.filter(m => memoryIds.includes(m.id))),
      size: memoryIds.length,
      totalSize: memories.filter(m => memoryIds.includes(m.id))
        .reduce((sum, m) => sum + (m.size || 0), 0)
    }));
  }

  clusterByAge(memories) {
    const ageGroups = {
      old: [],
      medium: [],
      recent: []
    };

    memories.forEach(memory => {
      const age = this.calculateAge(memory.createdAt);
      if (age > 24) ageGroups.old.push(memory.id);
      else if (age > 6) ageGroups.medium.push(memory.id);
      else ageGroups.recent.push(memory.id);
    });

    return Object.entries(ageGroups)
      .filter(([_, ids]) => ids.length > 0)
      .map(([ageGroup, memoryIds]) => ({
        id: uuidv4(),
        name: `${ageGroup} memories (${this.getAgeRange(ageGroup)})`,
        type: 'age',
        memoryIds,
          action: ageGroup === 'old' ? 'low_relevance' : ageGroup === 'medium' ? 'compress' : 'keep',
        size: memoryIds.length,
        totalSize: memories.filter(m => memoryIds.includes(m.id))
          .reduce((sum, m) => sum + (m.size || 0), 0)
      }));
  }

  clusterByContent(memories) {

    const keywordClusters = {
      'graduation': ['graduated', 'graduation', 'diploma', 'degree', 'university', 'college'],
      'work': ['work', 'job', 'office', 'meeting', 'project', 'deadline'],
      'personal': ['love', 'family', 'friend', 'birthday', 'holiday', 'vacation'],
      'blurry_images': ['blur', 'blurry', 'unclear']
    };

    const clusters = [];

    Object.entries(keywordClusters).forEach(([clusterName, keywords]) => {
      const matchingIds = memories
        .filter(m => {
          const content = (m.content || '').toLowerCase();
          return keywords.some(kw => content.includes(kw));
        })
        .map(m => m.id);

      if (matchingIds.length > 0) {
        clusters.push({
          id: uuidv4(),
          name: clusterName.replace('_', ' '),
          type: 'content',
          memoryIds: matchingIds,
          action: clusterName === 'blurry_images' ? 'low_relevance' :
                  clusterName === 'graduation' && this.areOld(memories.filter(m => matchingIds.includes(m.id))) ? 'low_relevance' : 'keep',
          size: matchingIds.length,
          totalSize: memories.filter(m => matchingIds.includes(m.id))
            .reduce((sum, m) => sum + (m.size || 0), 0)
        });
      }
    });

    return clusters;
  }

  mergeClusters(clusters, memories) {

    const merged = [];
    const used = new Set();


    clusters.sort((a, b) => b.size - a.size);

    clusters.forEach(cluster => {
      const overlap = cluster.memoryIds.some(id => used.has(id));

      if (!overlap || cluster.size > 5) {
        cluster.memoryIds.forEach(id => used.add(id));
        merged.push(cluster);
      }
    });


    const clusteredIds = new Set(merged.flatMap(c => c.memoryIds));
    const unclustered = memories.filter(m => !clusteredIds.has(m.id));

    if (unclustered.length > 0) {
      merged.push({
        id: uuidv4(),
        name: 'Other memories',
        type: 'default',
        memoryIds: unclustered.map(m => m.id),
        action: 'keep',
        size: unclustered.length,
        totalSize: unclustered.reduce((sum, m) => sum + (m.size || 0), 0)
      });
    }

    return merged;
  }

  getClusterAction(memories) {
    const avgRelevance = memories.reduce((sum, m) => sum + (m.relevance1Year || 0.5), 0) / memories.length;
    const avgAge = memories.reduce((sum, m) => sum + (m.age || 0), 0) / memories.length;

    if (avgRelevance < 0.2 && avgAge > 24) return 'low_relevance';
    if (avgRelevance < 0.4 || avgAge > 12) return 'compress';
    return 'keep';
  }

  calculateAge(createdAt) {
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = Math.abs(now - created);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
  }

  getAgeRange(ageGroup) {
    if (ageGroup === 'old') return '2+ years';
    if (ageGroup === 'medium') return '6-24 months';
    return '< 6 months';
  }

  areOld(memories) {
    return memories.every(m => this.calculateAge(m.createdAt) > 24);
  }
}

module.exports = CompressionAgent;

