"""Create suggestions related tables

Revision ID: e738a165df93
Revises: 1766a505bdf0
Create Date: 2026-07-07 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e738a165df93'
down_revision: Union[str, None] = '1766a505bdf0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create suggestions table
    op.create_table(
        'suggestions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('citizen_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('raw_submission', sa.String(), nullable=False),
        sa.Column('user_selected_category', sa.String(), nullable=False),
        sa.Column('voice_transcript', sa.String(), nullable=True),
        sa.Column('voice_url', sa.String(), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('address', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('verification_status', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('ai_summary', sa.String(), nullable=True),
        sa.Column('ai_category', sa.String(), nullable=True),
        sa.Column('priority_score', sa.Float(), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('duplicate_group_id', sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(['citizen_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create suggestion_images table
    op.create_table(
        'suggestion_images',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('suggestion_id', sa.UUID(), nullable=False),
        sa.Column('image_url', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['suggestion_id'], ['suggestions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create suggestion_status_histories table
    op.create_table(
        'suggestion_status_histories',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('suggestion_id', sa.UUID(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('remarks', sa.String(), nullable=True),
        sa.Column('changed_by', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['suggestion_id'], ['suggestions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('suggestion_status_histories')
    op.drop_table('suggestion_images')
    op.drop_table('suggestions')
