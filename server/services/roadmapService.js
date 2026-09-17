const aiRoadmapService = require('./aiRoadmapService');

module.exports = {
  generateRoadmap: aiRoadmapService.generateAiRoadmap,
  getActiveRoadmap: aiRoadmapService.getActiveRoadmap,
  updateTaskProgress: aiRoadmapService.updateTaskProgress
};
