import { Injectable } from '@angular/core';
import { State, Action, StateContext, Selector } from '@ngxs/store';
import { tap } from 'rxjs/operators';
import { Inquiry } from '../models/inquiry.model';
import { InquiriesService } from '../services/inquiries.service';

// Actions
export class LoadInquiries {
  static readonly type = '[Inquiries] Load Inquiries';
}

export class LoadInquiryById {
  static readonly type = '[Inquiries] Load Inquiry By Id';
  constructor(public id: string) {}
}

export class CreateInquiry {
  static readonly type = '[Inquiries] Create Inquiry';
  constructor(public inquiry: any) {}
}

export class UpdateInquiry {
  static readonly type = '[Inquiries] Update Inquiry';
  constructor(public id: string, public updates: any) {}
}

export class DeleteInquiry {
  static readonly type = '[Inquiries] Delete Inquiry';
  constructor(public id: string) {}
}

// State Model
export interface InquiriesStateModel {
  inquiries: Inquiry[];
  selectedInquiry: Inquiry | null;
  loading: boolean;
}

@State<InquiriesStateModel>({
  name: 'inquiries',
  defaults: {
    inquiries: [],
    selectedInquiry: null,
    loading: false
  }
})
@Injectable()
export class InquiriesState {
  constructor(private inquiriesService: InquiriesService) {}

  @Selector()
  static inquiries(state: InquiriesStateModel) {
    return state.inquiries;
  }

  @Selector()
  static selectedInquiry(state: InquiriesStateModel) {
    return state.selectedInquiry;
  }

  @Selector()
  static loading(state: InquiriesStateModel) {
    return state.loading;
  }

  @Selector()
  static newInquiries(state: InquiriesStateModel) {
    return state.inquiries.filter(i => i.status === 'new');
  }

  @Action(LoadInquiries)
  loadInquiries(ctx: StateContext<InquiriesStateModel>) {
    ctx.patchState({ loading: true });
    return this.inquiriesService.getAllInquiries().pipe(
      tap(inquiries => {
        ctx.patchState({ inquiries, loading: false });
      })
    );
  }

  @Action(LoadInquiryById)
  loadInquiryById(ctx: StateContext<InquiriesStateModel>, action: LoadInquiryById) {
    ctx.patchState({ loading: true });
    return this.inquiriesService.getInquiryById(action.id).pipe(
      tap(inquiry => {
        ctx.patchState({ selectedInquiry: inquiry || null, loading: false });
      })
    );
  }

  @Action(CreateInquiry)
  createInquiry(ctx: StateContext<InquiriesStateModel>, action: CreateInquiry) {
    return this.inquiriesService.createInquiry(action.inquiry).pipe(
      tap(inquiry => {
        const state = ctx.getState();
        ctx.patchState({
          inquiries: [...state.inquiries, inquiry]
        });
      })
    );
  }

  @Action(UpdateInquiry)
  updateInquiry(ctx: StateContext<InquiriesStateModel>, action: UpdateInquiry) {
    return this.inquiriesService.updateInquiry(action.id, action.updates).pipe(
      tap(updatedInquiry => {
        const state = ctx.getState();
        const inquiries = state.inquiries.map(i =>
          i.id === action.id ? updatedInquiry : i
        );
        ctx.patchState({
          inquiries,
          selectedInquiry: state.selectedInquiry?.id === action.id ? updatedInquiry : state.selectedInquiry
        });
      })
    );
  }

  @Action(DeleteInquiry)
  deleteInquiry(ctx: StateContext<InquiriesStateModel>, action: DeleteInquiry) {
    return this.inquiriesService.deleteInquiry(action.id).pipe(
      tap(() => {
        const state = ctx.getState();
        ctx.patchState({
          inquiries: state.inquiries.filter(i => i.id !== action.id)
        });
      })
    );
  }
}
