import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@teable/db-main-prisma';
import { DataPrismaModule } from '@teable/db-data-prisma';
import { AiModule } from '../ai/ai.module';
import { AppBuilderModule } from '../app-builder/app-builder.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { DocSearchModule } from '../doc-search/doc-search.module';
import { RecordOpenApiModule } from '../record/open-api/record-open-api.module';
import { TableOpenApiModule } from '../table/open-api/table-open-api.module';
import { FieldOpenApiModule } from '../field/open-api/field-open-api.module';
import { FieldModule } from '../field/field.module';
import { ViewOpenApiModule } from '../view/open-api/view-open-api.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { AgentService } from './agent.service';
import { AgentToolRegistryService } from './agent-tool-registry.service';
import { AgentMemoryService } from './agent-memory.service';
import { AgentPlannerService } from './agent-planner.service';
import { AgentExecutionService } from './agent-execution.service';
import { AgentTriggerService } from './agent-trigger.service';
import { AgentSchedulerService, AGENT_CRON_QUEUE } from './agent-scheduler.service';
import { AgentCronProcessor } from './agent-cron.processor';
import { AgentEventListener } from './agent-event.listener';
import { AgentOAuthService } from './agent-oauth.service';
import { AgentConversationService } from './agent-conversation.service';
import { GmailOAuthService } from './oauth/gmail-oauth.service';
import { SlackOAuthService } from './oauth/slack-oauth.service';
import { SlackClient } from './oauth/slack-client';
import { GitHubOAuthService } from './oauth/github-oauth.service';
import { GitHubClient } from './oauth/github-client';
import { AgentController } from './agent.controller';
import { AgentPermissionGuard } from './agent-permission.guard';
import { TeableMcpServerService } from './mcp/teable-mcp-server.service';
import { TeableMcpServerController } from './mcp/teable-mcp-server.controller';
import { McpClientAggregatorService } from './mcp/mcp-client-aggregator.service';
import { PluginMcpDiscoveryService } from './mcp/plugin-mcp-discovery.service';
import { InterfaceToolsService } from './mcp/interface-tools.service';
import { GuardrailService } from './agent-guardrail.service';

@Module({
  imports: [
    PrismaModule,
    DataPrismaModule,
    BullModule.registerQueue({ name: AGENT_CRON_QUEUE }),
    AiModule,
    AppBuilderModule,
    DashboardModule,
    HttpModule,
    DocSearchModule,
    RecordOpenApiModule,
    TableOpenApiModule,
    FieldOpenApiModule,
    FieldModule,
    ViewOpenApiModule,
    WorkflowModule,
  ],
  controllers: [AgentController, TeableMcpServerController],
  providers: [
    AgentService,
    AgentToolRegistryService,
    AgentMemoryService,
    AgentPlannerService,
    AgentExecutionService,
    AgentConversationService,
    AgentTriggerService,
    AgentSchedulerService,
    AgentCronProcessor,
    AgentEventListener,
    AgentOAuthService,
    GmailOAuthService,
    SlackOAuthService,
    SlackClient,
    GitHubOAuthService,
    GitHubClient,
    AgentPermissionGuard,
    TeableMcpServerService,
    McpClientAggregatorService,
    PluginMcpDiscoveryService,
    InterfaceToolsService,
    GuardrailService,
  ],
  exports: [
    AgentService,
    AgentToolRegistryService,
    TeableMcpServerService,
    McpClientAggregatorService,
    AgentMemoryService,
    AgentExecutionService,
    AgentConversationService,
    AgentTriggerService,
    AgentSchedulerService,
    AgentOAuthService,
    GmailOAuthService,
    SlackOAuthService,
    SlackClient,
    GitHubOAuthService,
    GitHubClient,
  ],
})
export class AgentModule {}
