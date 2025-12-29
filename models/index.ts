import mongoose, { Schema, model, models } from 'mongoose';

// User Schema
const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String },
    githubUsername: { type: String },
    source: { type: String, enum: ['manual', 'github'], default: 'manual' },
}, { timestamps: true });

// Project Schema
const ProjectSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    repoUrl: { type: String, required: true },
    owner: { type: String }, // GitHub owner
    repo: { type: String },  // GitHub repo name
    vercelProjectId: { type: String },
    vercelToken: { type: String },
    netlifySiteId: { type: String },
    netlifyToken: { type: String },
}, { timestamps: true });

// ProjectMember Schema (Association table with Role)
const ProjectMemberSchema = new Schema({
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
        type: String,
        enum: ['admin', 'lead', 'developer', 'viewer'],
        default: 'developer'
    },
}, { timestamps: true });

// Ensure unique combination of Project and User
ProjectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });

// Requirement Schema
const RequirementSchema = new Schema({
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true },
    description: { type: String }, // Markdown supported
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['draft', 'approved'],
        default: 'draft'
    },
    createdBy: { type: String, default: 'admin' },
}, { timestamps: true });

// Issue Schema
const IssueSchema = new Schema({
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    requirementId: { type: Schema.Types.ObjectId, ref: 'Requirement' }, // Linked Requirement
    title: { type: String, required: true },
    description: { type: String },
    type: {
        type: String,
        enum: ['bug', 'feature', 'improvement'],
        default: 'improvement'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['open', 'ai_running', 'pr_created', 'closed'],
        default: 'open'
    },
    assignedTo: { type: String, default: 'ai' }, // Defaults to AI in this portal
    prUrl: { type: String },
    githubId: { type: String }, // For tracking issues imported from GitHub
    aiExplanation: { type: String }, // Summary of changes/risks
    mergedAt: { type: Date }, // Timestamp of human approval
}, { timestamps: true });

IssueSchema.index({ githubId: 1 });

// ChatMessage Schema
const ChatMessageSchema = new Schema({
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    senderType: { type: String, enum: ['human', 'ai'], required: true },
    senderId: { type: String }, // User ID or 'ai'
    senderName: { type: String, required: true },
    content: { type: String, required: true },
}, { timestamps: true });

// Task Schema (Human-centric)
const TaskSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String },
    status: {
        type: String,
        enum: ['todo', 'in_progress', 'done'],
        default: 'todo'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    issueId: { type: Schema.Types.ObjectId, ref: 'Issue' },
    prUrl: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Documentation Schema (Technical Knowledge)
const DocumentationSchema = new Schema({
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true }, // Markdown support
    category: {
        type: String,
        enum: ['architecture', 'api', 'setup', 'ai-decisions', 'general'],
        default: 'general'
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Monitoring Schema (Production Health)
const MonitoringSchema = new Schema({
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    status: {
        type: String,
        enum: ['healthy', 'degraded', 'critical'],
        default: 'healthy'
    },
    metrics: {
        errorRate: { type: Number, default: 0 },
        latency: { type: Number, default: 0 },
        uptime: { type: Number, default: 100 },
        failureCount: { type: Number, default: 0 }
    },
    lastChecked: { type: Date, default: Date.now },
    lastIncident: {
        timestamp: { type: Date },
        description: { type: String },
        issueId: { type: Schema.Types.ObjectId, ref: 'Issue' }
    }
}, { timestamps: true });

// Notification Schema
const NotificationSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    type: {
        type: String,
        enum: ['pr_created', 'pr_merged', 'task_assigned', 'ops_incident', 'conflict'],
        required: true
    },
    message: { type: String, required: true },
    link: { type: String },
    isRead: { type: Boolean, default: false },
    isCritical: { type: Boolean, default: false },
}, { timestamps: true });

NotificationSchema.index({ userId: 1, createdAt: -1 });

// Ensure unique projectId for Monitoring
MonitoringSchema.index({ projectId: 1 }, { unique: true });

// Affinity Group Schema (Ideation Columns)
const AffinityGroupSchema = new Schema({
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true },
    color: { type: String, default: 'bg-gray-800' }, // Tailwind class or hex
    order: { type: Number, default: 0 },
}, { timestamps: true });

// Affinity Item Schema (Sticky Notes)
const AffinityItemSchema = new Schema({
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'AffinityGroup', default: null }, // Null means ungrouped
    content: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    color: { type: String, default: 'bg-yellow-200' }, // Note color
}, { timestamps: true });

// Helper to handle model re-registration in Next.js HMR
const getModel = (name: string, schema: Schema) => {
    return models[name] || model(name, schema);
};

export const User = getModel('User', UserSchema);
export const Project = getModel('Project', ProjectSchema);
export const ProjectMember = getModel('ProjectMember', ProjectMemberSchema);
export const Issue = getModel('Issue', IssueSchema);
export const Requirement = getModel('Requirement', RequirementSchema);
export const ChatMessage = getModel('ChatMessage', ChatMessageSchema);
export const Task = getModel('Task', TaskSchema);
export const Documentation = getModel('Documentation', DocumentationSchema);
export const Monitoring = getModel('Monitoring', MonitoringSchema);
export const Notification = getModel('Notification', NotificationSchema);
export const AffinityGroup = getModel('AffinityGroup', AffinityGroupSchema);
export const AffinityItem = getModel('AffinityItem', AffinityItemSchema);
