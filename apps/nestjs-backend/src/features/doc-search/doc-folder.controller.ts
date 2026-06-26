import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { DocFolderService, ICreateDocFolder, IUpdateDocFolder } from './doc-folder.service';

@Controller('api/spaces/:spaceId/doc-folders')
export class DocFolderController {
  constructor(private readonly docFolderService: DocFolderService) {}

  @Get('/')
  async listFolders(@Param('spaceId') spaceId: string) {
    return this.docFolderService.listFolders(spaceId);
  }

  @Post('/')
  async createFolder(@Param('spaceId') spaceId: string, @Body() body: ICreateDocFolder) {
    return this.docFolderService.createFolder(spaceId, body);
  }

  @Patch('/:folderId')
  async updateFolder(
    @Param('spaceId') spaceId: string,
    @Param('folderId') folderId: string,
    @Body() body: IUpdateDocFolder
  ) {
    return this.docFolderService.updateFolder(spaceId, folderId, body);
  }

  @Delete('/:folderId')
  async deleteFolder(@Param('spaceId') spaceId: string, @Param('folderId') folderId: string) {
    return this.docFolderService.deleteFolder(spaceId, folderId);
  }
}
