// Skill: pipeline.update_rules — 修改标注规则文件
const path = require('path');
const fs = require('fs');

const SKILLS_DIR = path.resolve(process.env.PYTHON_SKILLS_DIR || path.join(__dirname, '..', 'external-skills'));
const RULES_FILE = path.join(SKILLS_DIR, 'lexiang-query-classify', 'references', 'rules.md');
const SCENE_FILE = path.join(SKILLS_DIR, 'lexiang-query-classify', '场景分类定义.md');

module.exports = {
  name: 'pipeline.update_rules',
  description: '修改标注规则文件。支持三种操作：read(读取当前规则)、append(追加规则)、replace(替换指定内容)。管理员专用。',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['read', 'append', 'replace'],
        description: '操作类型: read=读取规则文件, append=追加内容, replace=替换指定文本'
      },
      file: {
        type: 'string',
        enum: ['rules', 'scene'],
        description: '规则文件: rules=标注规则(rules.md), scene=场景分类定义'
      },
      content: {
        type: 'string',
        description: 'append时为追加内容, replace时为新文本(替换old_text)'
      },
      old_text: {
        type: 'string',
        description: 'replace操作时要被替换的原文(必须精确匹配)'
      }
    },
    required: ['action', 'file']
  },
  execute: async ({ action, file = 'rules', content, old_text }, context) => {
    if (!context.permissions?.includes('*')) {
      throw new Error('仅管理员可修改标注规则');
    }

    const filePath = file === 'scene' ? SCENE_FILE : RULES_FILE;
    const label = file === 'scene' ? '场景分类定义' : '标注规则';

    if (action === 'read') {
      if (!fs.existsSync(filePath)) {
        throw new Error(`${label}文件不存在: ${filePath}`);
      }
      const text = fs.readFileSync(filePath, 'utf-8');
      return { file: label, path: filePath, size: text.length, content: text };
    }

    if (action === 'append') {
      if (!content) throw new Error('append 操作需要提供 content');
      if (!fs.existsSync(filePath)) {
        throw new Error(`${label}文件不存在: ${filePath}`);
      }
      const original = fs.readFileSync(filePath, 'utf-8');
      const updated = original.trimEnd() + '\n\n' + content.trim() + '\n';
      fs.writeFileSync(filePath, updated, 'utf-8');
      return { file: label, action: 'append', added_lines: content.trim().split('\n').length };
    }

    if (action === 'replace') {
      if (!old_text || !content) throw new Error('replace 操作需要提供 old_text 和 content');
      if (!fs.existsSync(filePath)) {
        throw new Error(`${label}文件不存在: ${filePath}`);
      }
      const original = fs.readFileSync(filePath, 'utf-8');
      const fuzzyOriginal = original.replace(/\r\n/g, '\n');
      const fuzzyOld = old_text.replace(/\r\n/g, '\n');
      if (!fuzzyOriginal.includes(fuzzyOld)) {
        throw new Error(`未找到要替换的文本。请确保 old_text 与文件中的内容精确匹配。`);
      }
      const updated = fuzzyOriginal.replace(fuzzyOld, content.trim());
      fs.writeFileSync(filePath, updated, 'utf-8');
      return { file: label, action: 'replace' };
    }

    throw new Error(`不支持的操作: ${action}`);
  }
};
