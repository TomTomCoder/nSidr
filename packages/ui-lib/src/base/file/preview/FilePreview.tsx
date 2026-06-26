import { lazy, Suspense, useContext, useMemo } from 'react';
import { cn } from '../../../shadcn';
import { AudioPreview } from './audio/AudioPreview';
import { FilePreviewContext } from './FilePreviewContext';
import { getFileIcon } from './getFileIcon';
import { ImagePreview } from './image/ImagePreview';
import { WordPreview } from './office/WordPreview';
import { PDFPreview } from './pdf/PDFPreview';
import { isAudio, isImage, isVideo, isPdf, isWord, isExcel } from './utils';
import { VideoPreview } from './video/VideoPreview';

// Lazy boundary: xlsx (~223 KB) + glide-data-grid only load when an Excel file is previewed.
const ExcelPreview = lazy(() =>
  import('./office/ExcelPreview').then((m) => ({ default: m.ExcelPreview }))
);

interface IFilePreviewProps {
  className?: string;
}

export const FilePreview = (props: IFilePreviewProps) => {
  const { className } = props;
  const { currentFile, closePreview } = useContext(FilePreviewContext);

  const mimetype = currentFile?.mimetype;

  const FileIcon = useMemo(() => (mimetype ? getFileIcon(mimetype) : ''), [mimetype]);

  if (!mimetype || !FileIcon) {
    return null;
  }

  switch (true) {
    case isImage(mimetype):
      return <ImagePreview {...currentFile} onClose={closePreview} />;
    case isVideo(mimetype):
      return <VideoPreview {...currentFile} />;
    case isAudio(mimetype):
      return <AudioPreview {...currentFile} />;
    case isPdf(mimetype):
      return <PDFPreview {...currentFile} />;
    case isWord(mimetype):
      return <WordPreview {...currentFile} />;
    case isExcel(mimetype):
      return (
        <Suspense fallback={null}>
          <ExcelPreview {...currentFile} />
        </Suspense>
      );
    default:
      return <FileIcon className={cn('max-w-max max-h-max w-40 h-40 ', className)} />;
  }
};
