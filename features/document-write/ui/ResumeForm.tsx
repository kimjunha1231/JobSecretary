'use client';

import { useResumeForm } from '../hooks';
import StatusConfirmationDialog from './StatusConfirmationDialog';
import {
    ResumeFormHeader,
    ResumeSectionNavigation,
    ResumeSectionEditor,
    ResumeActions
} from './form-parts';

export default function ResumeForm() {
    const {
        formData,
        sections,
        currentSectionIndex,
        currentSection,
        isSaving,
        showStatusDialog,
        isAutoDraftOpen,
        setFormData,
        addSection,
        removeSection,
        updateSection,
        setSearchTags,
        goToPrevSection,
        goToNextSection,
        handleSave,
        handleStatusConfirm,
        handleDraftGenerated,
        setShowStatusDialog,
        setIsAutoDraftOpen
    } = useResumeForm();

    return (
        <div className="space-y-6">
            <ResumeFormHeader
                formData={formData}
                setFormData={setFormData}
                setSearchTags={setSearchTags}
            />

            <ResumeSectionNavigation
                currentSectionIndex={currentSectionIndex}
                totalSections={sections.length}
                goToPrevSection={goToPrevSection}
                goToNextSection={goToNextSection}
                addSection={addSection}
                removeSection={removeSection}
            />

            <ResumeSectionEditor
                section={currentSection}
                index={currentSectionIndex}
                updateSection={updateSection}
                isAutoDraftOpen={isAutoDraftOpen}
                setIsAutoDraftOpen={setIsAutoDraftOpen}
                handleDraftGenerated={handleDraftGenerated}
                formData={formData}
            />

            <ResumeActions
                onSave={handleSave}
                isSaving={isSaving}
            />

            <StatusConfirmationDialog
                isOpen={showStatusDialog}
                onClose={() => setShowStatusDialog(false)}
                onConfirm={handleStatusConfirm}
            />
        </div>
    );
}
